'use client';
import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type Msg = { role: 'guest' | 'assistant'; content: string };

// Converts **bold** markers to <strong> and leaves the rest as plain text.
// Newlines render as line breaks via whitespace-pre-wrap on the parent bubble.
// No dangerouslySetInnerHTML — React escapes all content safely.
function renderAssistant(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

// Localised quick-reply chips shown in the empty state.
const SUGGESTIONS: Record<string, string[]> = {
  en: ['What time is breakfast?', 'I need help with my room', 'Restaurants nearby'],
  el: ['Τι ώρα είναι το πρωινό;', 'Χρειάζομαι βοήθεια με το δωμάτιο', 'Εστιατόρια κοντά'],
};

export function Chat() {
  const { locale, t } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Accepts an optional overrideText so suggestion chips can trigger a send
  // without waiting for a React state update to propagate the text to `input`.
  async function send(overrideText?: string) {
    const text = (overrideText !== undefined ? overrideText : input).trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    setMessages((m) => [...m, { role: 'guest', content: text }, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok || !res.body) throw new Error('failed');

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value);
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: copy[copy.length - 1].content + chunk };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: t.complaint.error };
        return copy;
      });
    } finally {
      setSending(false);
    }
  }

  const suggestions = SUGGESTIONS[locale] ?? SUGGESTIONS.en;

  return (
    <div className="flex h-full flex-col">
      {/* overflow-x-hidden prevents any long token from creating a horizontal scrollbar */}
      <div className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden pb-2">

        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 px-2 py-8">
            <p className="text-center text-sm text-text-muted">{t.chat.empty}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((chip) => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  disabled={sending}
                  className={
                    'rounded-full border border-border bg-white/60 px-3 py-1.5 text-xs text-text-muted ' +
                    'transition-colors hover:border-brand hover:bg-brand/10 hover:text-brand ' +
                    'disabled:opacity-40 disabled:pointer-events-none'
                  }
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'guest' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={
                // min-w-0 lets the bubble shrink below its natural size inside the flex row.
                // break-words wraps long tokens (URLs, phone numbers) at the bubble boundary.
                // whitespace-pre-wrap preserves newlines sent by the model (list items, line breaks).
                'animate-rise min-w-0 break-words whitespace-pre-wrap ' +
                'rounded-2xl px-4 py-2.5 text-sm leading-relaxed ' +
                (m.role === 'guest'
                  ? 'max-w-[80%] rounded-br-md bg-brand text-text-invert'
                  : 'max-w-[85%] rounded-bl-md bg-black/5 text-text')
              }
            >
              {m.role === 'assistant'
                ? (m.content ? renderAssistant(m.content) : <span className="opacity-50">…</span>)
                : (m.content || <span className="opacity-50">…</span>)
              }
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        {/* text-base (16px) prevents iOS Safari from auto-zooming on input focus */}
        <Textarea
          className="max-h-32 min-h-11 flex-1 resize-none py-2.5 text-base"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={t.chat.placeholder}
        />
        <Button
          onClick={() => send()}
          disabled={sending || !input.trim()}
          className="min-h-11 px-5"
        >
          {t.chat.send}
        </Button>
      </div>
    </div>
  );
}
