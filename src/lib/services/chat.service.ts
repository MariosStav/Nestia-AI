import 'server-only';
import { createAdminClient } from '@/lib/db/admin';
import { getActiveSession } from './session.service';
import type { ChatMessage, MessageClassification, QueryType, WebSource } from '@/lib/llm/types';

type SessionShape = { id: string; hotel_id: string; room_id: string; locale: string };
type KBItem = { question: string; answer: string };
type HotelData = {
  reception_phone?: string | null;
  reception_email?: string | null;
  reception_hours?: string | null;
};

export type RawContext = {
  session: SessionShape;
  kb: KBItem[];
  hotel: HotelData | null;
  room: { label: string } | null;
  messages: ChatMessage[];
};

// Loads KB + history + hotel + room data in parallel, persists the guest message,
// and returns raw context for the routing layer to decide the prompt.
export async function loadRawContext(guestText: string): Promise<RawContext | null> {
  const session = await getActiveSession();
  if (!session) return null;
  const db = createAdminClient();

  const [{ data: kb }, { data: history }, { data: hotel }, { data: room }] = await Promise.all([
    db.from('knowledge_items').select('question, answer').eq('hotel_id', session.hotel_id).eq('is_active', true),
    db.from('messages').select('role, content').eq('session_id', session.id).order('created_at', { ascending: true }),
    db.from('hotels').select('reception_phone, reception_email, reception_hours').eq('id', session.hotel_id).single(),
    db.from('rooms').select('label').eq('id', session.room_id).single(),
  ]);

  await db.from('messages').insert({
    hotel_id: session.hotel_id,
    session_id: session.id,
    role: 'guest',
    content: guestText,
  });

  const messages: ChatMessage[] = (history ?? []).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));
  messages.push({ role: 'user', content: guestText });

  return {
    session: session as SessionShape,
    kb: kb ?? [],
    hotel: hotel ?? null,
    room: room ?? null,
    messages,
  };
}

// Returns the correct system prompt for the classified query type.
// hotel_specific and unclear both use the strict KB-only prompt for safety.
// detectedLang ('el' | 'en' | 'auto') takes priority over sessionLocale so the
// assistant always replies in the language the guest actually wrote in.
export function buildSystemPrompt(
  queryType: QueryType,
  kb: KBItem[],
  hotel: HotelData | null,
  sessionLocale: string,
  detectedLang: string = 'auto',
  roomLabel: string | null = null
): string {
  const lang = resolveResponseLang(detectedLang, sessionLocale);
  const kbText = buildKbText(kb);
  const contactText = buildContactText(hotel);
  const roomContext = buildRoomContext(roomLabel);

  switch (queryType) {
    case 'hotel_specific':
    case 'unclear':
      return [
        `You are Nestia AI, a hotel concierge assistant for guests. Always reply in ${lang}.`,
        roomContext,
        'Answer using the session context above and the HOTEL KNOWLEDGE BASE below.',
        `If the knowledge base content is in a different language, translate the factual answer into ${lang} without changing any facts.`,
        `If the answer is not in the knowledge base (and is not covered by the session context), say you do not have confirmed information and offer to connect the guest with staff (${contactText}).`,
        'Never invent hotel policies, services, prices, times, or availability.',
        'Keep the answer concise and practical.',
        'Write plain text only — no markdown formatting, no **asterisks**, no # headers.',
        '',
        'HOTEL KNOWLEDGE BASE:',
        kbText,
      ].join('\n');

    case 'complaint_or_request':
      return [
        `You are Nestia AI, a hotel concierge assistant for guests. Always reply in ${lang}.`,
        roomContext,
        'The guest may be reporting a problem, complaint, maintenance issue, or service request.',
        'Acknowledge the issue politely and empathetically.',
        'Tell the guest their issue has been forwarded to staff and that someone will follow up shortly.',
        'Do not overpromise or attempt to resolve technical issues yourself.',
        'Do not invent hotel-specific facts.',
        'Write plain text only — no markdown formatting, no **asterisks**, no # headers.',
      ].join('\n');

    case 'general_common_sense':
      return [
        `You are Nestia AI, a hotel concierge assistant for guests. Always reply in ${lang}.`,
        roomContext,
        'The guest is asking a general common-sense question, not a hotel-specific question.',
        'Answer using general knowledge. Keep the answer short, friendly, and useful.',
        'For arithmetic or math questions, compute the result and state it directly — for example: 25 × 189 = 4,725.',
        'Never claim the hotel provides something unless it appears in the HOTEL KNOWLEDGE BASE below.',
        'Do not invent hotel-specific facts.',
        'Write plain text only — no markdown formatting, no **asterisks**, no # headers.',
        '',
        'HOTEL KNOWLEDGE BASE (reference only — do not invent beyond this):',
        kbText,
      ].join('\n');

    case 'local_or_current_web':
      return [
        `You are Nestia AI, a hotel concierge assistant for guests. Always reply in ${lang}.`,
        roomContext,
        'The guest is asking for local, current, or review-based information.',
        'You have web search available — use it to find relevant public information.',
        'Format your answer as a short numbered list (1. 2. 3. — up to 5 items).',
        'You may use **bold** for place or restaurant names for readability.',
        'Do not include raw URLs in your answer text — source links are stored separately.',
        'Always note that information may change; do not guarantee opening hours, ratings, or availability.',
        'Do not make reservations on behalf of the guest.',
      ].join('\n');
  }
}

// Resolves the response language from the classifier's detected_language,
// falling back to session locale when the message language is uncertain.
function resolveResponseLang(detected: string, sessionLocale: string): string {
  if (detected === 'en') return 'English';
  if (detected === 'el') return 'Greek';
  return sessionLocale === 'en' ? 'English' : 'Greek';
}

// Builds the authoritative room context block injected into every system prompt.
// The LLM must answer room-identity questions using this — not from the KB.
function buildRoomContext(roomLabel: string | null): string {
  if (!roomLabel) return '';
  return [
    `SESSION CONTEXT (authoritative — always trust this over other sources):`,
    `- The guest is currently in Room ${roomLabel}.`,
    `- If the guest asks which room they are in, confirm it directly in the reply language. Example: "Yes, this chat is connected to Room ${roomLabel}."`,
  ].join('\n');
}

// Persists the assistant message. Stores classification and web sources in
// metadata.sources when present so they can be surfaced in the UI later.
// TODO: render metadata.sources as clickable links below assistant messages in chat.tsx.
export async function saveAssistantMessage(
  session: SessionShape,
  content: string,
  classification: MessageClassification | null,
  sources: WebSource[] = []
): Promise<void> {
  const db = createAdminClient();
  const metadata: Record<string, unknown> = {};
  if (classification) metadata.classification = classification;
  if (sources.length > 0) metadata.sources = sources;
  await db.from('messages').insert({
    hotel_id: session.hotel_id,
    session_id: session.id,
    role: 'assistant',
    content,
    metadata,
  });
}

// Creates a staff ticket from the new combined classification.
// Translates urgency/sentiment to the values the tickets table expects.
export async function createTicketFromClassification(
  session: SessionShape,
  guestText: string,
  classification: MessageClassification
): Promise<void> {
  const db = createAdminClient();
  const urgencyMap: Record<string, string> = { low: 'low', medium: 'normal', high: 'high' };
  const sentimentMap: Record<string, number> = { positive: 0.7, neutral: 0, negative: -0.7 };
  await db.from('tickets').insert({
    hotel_id: session.hotel_id,
    room_id: session.room_id,
    session_id: session.id,
    source: 'auto_sentiment',
    category: classification.category,
    urgency: urgencyMap[classification.urgency] ?? 'normal',
    sentiment: sentimentMap[classification.sentiment] ?? 0,
    guest_message: guestText,
  });
}

function buildKbText(kb: KBItem[]): string {
  return kb.length
    ? kb.map((k) => `Q: ${k.question}\nA: ${k.answer}`).join('\n\n')
    : '(No hotel-specific information is available yet.)';
}

function buildContactText(hotel: HotelData | null): string {
  const bits = [
    hotel?.reception_phone ? `phone: ${hotel.reception_phone}` : null,
    hotel?.reception_email ? `email: ${hotel.reception_email}` : null,
    hotel?.reception_hours ? `hours: ${hotel.reception_hours}` : null,
  ].filter(Boolean).join(', ');
  return bits || 'reception';
}
