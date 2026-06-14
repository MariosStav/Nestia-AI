import { NextRequest } from 'next/server';
import { loadChatContext, classifyAndMaybeTicket, saveAssistantMessage } from '@/lib/services/chat.service';
import { llm } from '@/lib/llm';

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text || !text.trim()) return Response.json({ ok: false, error: 'empty' }, { status: 400 });

  const ctx = await loadChatContext(text);
  if (!ctx) return Response.json({ ok: false, error: 'invalid_session' }, { status: 401 });

  const { session, system, messages } = ctx;

  // Runs in parallel with the reply stream — never blocks the guest's answer.
  const classifyPromise = classifyAndMaybeTicket(session, text);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let full = '';
      try {
        for await (const chunk of llm.stream({ system, messages })) {
          full += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch {
        /* streaming failed mid-way — close gracefully with whatever we have */
      }
      const classification = await classifyPromise.catch(() => null);
      await saveAssistantMessage(session, full, classification);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}