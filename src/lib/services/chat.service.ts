import 'server-only';
import { createAdminClient } from '@/lib/db/admin';
import { getActiveSession } from './session.service';
import { llm } from '@/lib/llm';
import type { ChatMessage } from '@/lib/llm/types';

const CATEGORIES = ['cleanliness', 'noise', 'maintenance', 'food', 'service', 'other'] as const;

export type Classification = {
  is_complaint: boolean;
  category: (typeof CATEGORIES)[number];
  urgency: 'low' | 'normal' | 'high' | 'critical';
  sentiment: number; // -1..1
};

const classificationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    is_complaint: { type: 'boolean' },
    category: { type: 'string', enum: [...CATEGORIES] },
    urgency: { type: 'string', enum: ['low', 'normal', 'high', 'critical'] },
    sentiment: { type: 'number' },
  },
  required: ['is_complaint', 'category', 'urgency', 'sentiment'],
};

type SessionShape = { id: string; hotel_id: string; room_id: string; locale: string };

// Loads KB + history, persists the guest message, builds the prompt context.
export async function loadChatContext(guestText: string) {
  const session = await getActiveSession();
  if (!session) return null;
  const db = createAdminClient();

  const { data: kb } = await db
    .from('knowledge_items')
    .select('question, answer')
    .eq('hotel_id', session.hotel_id)
    .eq('is_active', true);

  const { data: history } = await db
    .from('messages')
    .select('role, content')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true });

    const { data: hotel } = await db
    .from('hotels')
    .select('reception_phone, reception_email, reception_hours')
    .eq('id', session.hotel_id)
    .single();

    
  await db.from('messages').insert({
    hotel_id: session.hotel_id,
    session_id: session.id,
    role: 'guest',
    content: guestText,
  });

  const system = buildSystemPrompt(kb ?? [], session.locale, hotel);
  const messages: ChatMessage[] = (history ?? []).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));
  messages.push({ role: 'user', content: guestText });

  return { session: session as SessionShape, system, messages };
}

// Classifies the guest message; if it's a complaint, raises a ticket.
// Must never throw into the chat path — failures return null.
export async function classifyAndMaybeTicket(session: SessionShape, guestText: string): Promise<Classification | null> {
  const sys =
    'Ταξινόμησε το μήνυμα ενός επισκέπτη ξενοδοχείου. ' +
    'is_complaint=true ΜΟΝΟ αν εκφράζει δυσαρέσκεια, παράπονο ή πρόβλημα. ' +
    'category: η καταλληλότερη κατηγορία. urgency: ανάλογα με τη σοβαρότητα. ' +
    'sentiment: από -1 (πολύ αρνητικό) έως 1 (πολύ θετικό).';
  let c: Classification;
  try {
    c = await llm.classify<Classification>({
      system: sys,
      input: guestText,
      schema: classificationSchema,
      schemaName: 'complaint_classification',
    });
  } catch {
    return null;
  }

  if (c.is_complaint) {
    const db = createAdminClient();
    await db.from('tickets').insert({
      hotel_id: session.hotel_id,
      room_id: session.room_id,
      session_id: session.id,
      source: 'auto_sentiment',
      category: c.category,
      urgency: c.urgency,
      sentiment: c.sentiment,
      guest_message: guestText,
    });
  }
  return c;
}

export async function saveAssistantMessage(session: SessionShape, content: string, classification: Classification | null) {
  const db = createAdminClient();
  await db.from('messages').insert({
    hotel_id: session.hotel_id,
    session_id: session.id,
    role: 'assistant',
    content,
    metadata: classification ? { classification } : {},
  });
}

function buildSystemPrompt(
  kb: { question: string; answer: string }[],
  locale: string,
  hotel: { reception_phone?: string | null; reception_email?: string | null; reception_hours?: string | null } | null
) {
  const kbText = kb.length
    ? kb.map((k) => `Ε: ${k.question}\nΑ: ${k.answer}`).join('\n\n')
    : '(Δεν υπάρχουν διαθέσιμες πληροφορίες για το ξενοδοχείο ακόμα.)';
  const lang = locale === 'en' ? 'English' : 'Greek';

  const contactBits = [
    hotel?.reception_phone ? `τηλέφωνο: ${hotel.reception_phone}` : null,
    hotel?.reception_email ? `email: ${hotel.reception_email}` : null,
    hotel?.reception_hours ? `ώρες λειτουργίας: ${hotel.reception_hours}` : null,
  ].filter(Boolean).join(', ');
  const contactText = contactBits || 'επικοινωνήστε με τη ρεσεψιόν του ξενοδοχείου';

  return [
    `You are Nestia, a warm, concise hotel concierge assistant. Always reply in ${lang}.`,
    '',
    'You handle TWO kinds of questions differently:',
    '1. GENERAL / common-sense questions (date, time, weather concepts, currency, general travel tips, small talk): answer naturally and helpfully using common sense.',
    '2. HOTEL-SPECIFIC questions (breakfast hours, amenities, room service, prices, facilities, policies): answer ONLY from the HOTEL KNOWLEDGE BASE below. NEVER invent or guess hotel facts.',
    '',
    `If a hotel-specific question is not covered by the knowledge base, do NOT guess. Politely tell the guest you will pass the request to the staff, and provide reception contact details: ${contactText}.`,
    '',
    'HOTEL KNOWLEDGE BASE:',
    kbText,
  ].join('\n');
}