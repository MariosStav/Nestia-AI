import 'server-only';
import OpenAI from 'openai';
import type { LLMProvider, ChatMessage, MessageClassification, WebAnswer, WebSource } from './types';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ⚠️ ΕΠΙΒΕΒΑΙΩΣΕ τα model IDs στο OpenAI dashboard πριν τα κλειδώσεις.
const CHAT_MODEL = 'gpt-5.4-mini';
const CLASSIFY_MODEL = 'gpt-5.4-nano';

// JSON schema for the combined message classifier.
// Must match MessageClassification exactly — used with strict: true.
const MESSAGE_CLASSIFICATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    query_type: {
      type: 'string',
      enum: ['hotel_specific', 'complaint_or_request', 'general_common_sense', 'local_or_current_web', 'unclear'],
    },
    is_complaint: { type: 'boolean' },
    needs_ticket: { type: 'boolean' },
    category: { type: 'string', enum: ['cleanliness', 'noise', 'maintenance', 'food', 'service', 'other'] },
    urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
    detected_language: { type: 'string', enum: ['el', 'en', 'auto'] },
    reason: { type: 'string' },
  },
  required: ['query_type', 'is_complaint', 'needs_ticket', 'category', 'urgency', 'sentiment', 'detected_language', 'reason'],
};

const CLASSIFY_SYSTEM =
  'You are a hotel chatbot message classifier. Classify each guest message into exactly one query_type:\n\n' +
  '- hotel_specific: questions about THIS specific hotel\'s policies, services, amenities, breakfast times, parking, checkout procedures, Wi-Fi, prices, housekeeping, pool/spa, reception hours, room services, minibar, laundry\n' +
  '- complaint_or_request: complaints, dissatisfaction, maintenance issues (AC broken, water leaking, lights out, noise), service requests (need towels, need iron), safety concerns, urgent room problems\n' +
  '- general_common_sense: ALL simple questions that do not need live data and do not concern THIS hotel specifically. INCLUDES: arithmetic/math (how much is 25 × 189, what is 10 + 10, πόσο κάνει X επί Y), language/translation questions (how do you say X in Greek), packing advice (what to bring to the beach), general travel tips, historical facts, currency basics, small talk, greetings, jokes, recipes, etiquette\n' +
  '- local_or_current_web: questions requiring current/live/public information — restaurant recommendations, bar reviews, local events today, current weather forecast, attraction opening hours, "what\'s open now near me", "best beaches near Katerini"\n' +
  '- unclear: genuinely ambiguous — only when the message truly cannot be assigned to any of the above\n\n' +
  'CRITICAL RULES:\n' +
  '1. If the message does NOT mention any hotel concept (breakfast, parking, reception, room, pool, spa, checkout, check-in, towels, Wi-Fi, booking, price, amenity, hotel policy), it is almost certainly NOT hotel_specific.\n' +
  '2. Simple math/arithmetic questions are ALWAYS general_common_sense — never hotel_specific.\n' +
  '3. Language/translation questions are ALWAYS general_common_sense.\n' +
  '4. Packing tips, travel tips, and common-sense lifestyle questions are ALWAYS general_common_sense.\n' +
  '5. When in doubt between hotel_specific and general_common_sense, choose general_common_sense.\n\n' +
  'Also set:\n' +
  '- is_complaint: true only if the guest expresses dissatisfaction, a problem, or a complaint\n' +
  '- needs_ticket: true if staff should be notified (complaints, maintenance, safety, service requests)\n' +
  '- category: most relevant ticket category (pick closest even if needs_ticket is false)\n' +
  '- urgency: high for safety/water/fire/medical, medium for comfort issues, low for everything else\n' +
  '- sentiment: overall emotional tone of the message\n' +
  '- detected_language: the language the guest wrote in — use "en" for English, "el" for Greek, "auto" if genuinely mixed or unrecognisable\n' +
  '- reason: one short sentence explaining your classification';

export const openaiProvider: LLMProvider = {
  // -------------------------------------------------------------------------
  // Existing methods — unchanged
  // -------------------------------------------------------------------------

  async *stream({ system, messages }) {
    const stream = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: 'system', content: system }, ...messages],
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  },

  async classify<T>({ system, input, schema, schemaName = 'result' }: {
    system: string;
    input: string;
    schema: Record<string, unknown>;
    schemaName?: string;
  }): Promise<T> {
    const res = await client.chat.completions.create({
      model: CLASSIFY_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: input },
      ],
      response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } },
    });
    const text = res.choices[0]?.message?.content ?? '{}';
    return JSON.parse(text) as T;
  },

  // -------------------------------------------------------------------------
  // New: combined message classifier for chat routing
  // -------------------------------------------------------------------------

  async classifyMessage(text: string): Promise<MessageClassification> {
    const res = await client.chat.completions.create({
      model: CLASSIFY_MODEL,
      messages: [
        { role: 'system', content: CLASSIFY_SYSTEM },
        { role: 'user', content: text },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'message_classification',
          strict: true,
          schema: MESSAGE_CLASSIFICATION_SCHEMA,
        },
      },
    });
    const raw = res.choices[0]?.message?.content ?? '{}';
    return JSON.parse(raw) as MessageClassification;
  },

  // -------------------------------------------------------------------------
  // New: web-search answer via OpenAI Responses API
  // Sources are deduplicated by URL and returned alongside the text content.
  // -------------------------------------------------------------------------

  async generateWebAnswer({ system, query }: { system: string; query: string }): Promise<WebAnswer> {
    const response = await client.responses.create({
      model: CHAT_MODEL,
      tools: [{ type: 'web_search' }],
      instructions: system,
      input: query,
    });

    const content = response.output_text ?? '';
    const sources: WebSource[] = [];

    for (const item of response.output) {
      if (item.type === 'message') {
        for (const part of item.content) {
          if (part.type === 'output_text') {
            for (const annotation of part.annotations) {
              if (annotation.type === 'url_citation') {
                const duplicate = sources.some((s) => s.url === annotation.url);
                if (!duplicate) {
                  sources.push({ title: annotation.title, url: annotation.url });
                }
              }
            }
          }
        }
      }
    }

    return { content, sources };
  },
};
