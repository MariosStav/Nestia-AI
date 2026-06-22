import { NextRequest } from 'next/server';
import {
  loadRawContext,
  buildSystemPrompt,
  saveAssistantMessage,
  createTicketFromClassification,
} from '@/lib/services/chat.service';
import { llm } from '@/lib/llm';
import type { MessageClassification, WebSource } from '@/lib/llm/types';

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text || !text.trim()) return Response.json({ ok: false, error: 'empty' }, { status: 400 });

  const ctx = await loadRawContext(text);
  if (!ctx) return Response.json({ ok: false, error: 'invalid_session' }, { status: 401 });

  // Classify before the stream — the result determines which prompt and path to use.
  // On any failure we fall back to hotel_specific so the guest always gets a safe answer.
  let classification: MessageClassification | null = null;
  try {
    classification = await llm.classifyMessage(text);
  } catch {
    // classification failed — hotel_specific fallback applied below
  }

  const queryType = classification?.query_type ?? 'hotel_specific';
  const system = buildSystemPrompt(
    queryType,
    ctx.kb,
    ctx.hotel,
    ctx.session.locale,
    classification?.detected_language ?? 'auto',
    ctx.room?.label ?? null
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let full = '';
      let sources: WebSource[] = [];

      try {
        if (queryType === 'local_or_current_web') {
          // Web search path: Responses API returns a complete answer (not chunked).
          // The full response is enqueued as a single chunk — guest sees it appear at once.
          // Sources are stored in messages.metadata.sources.
          // TODO: render metadata.sources as clickable links in chat.tsx.
          const result = await llm.generateWebAnswer({ system, query: text });
          full = result.content;
          sources = result.sources;
          if (full) controller.enqueue(encoder.encode(full));
        } else {
          // All other paths: standard Chat Completions streaming, fully preserved.
          for await (const chunk of llm.stream({ system, messages: ctx.messages })) {
            full += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
        }
      } catch {
        /* streaming failed mid-way — close gracefully with whatever we have */
      }

      await Promise.all([
        saveAssistantMessage(ctx.session, full, classification, sources),
        classification?.needs_ticket
          ? createTicketFromClassification(ctx.session, text, classification).catch(() => null)
          : Promise.resolve(),
      ]);

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
