import 'server-only';
import OpenAI from 'openai';
import type { LLMProvider, ChatMessage } from './types';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ⚠️ ΕΠΙΒΕΒΑΙΩΣΕ τα model IDs στο OpenAI dashboard πριν τα κλειδώσεις.
const CHAT_MODEL = 'gpt-5.4-mini';
const CLASSIFY_MODEL = 'gpt-5.4-nano';

export const openaiProvider: LLMProvider = {
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
    schema: Record<string, any>;
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
};