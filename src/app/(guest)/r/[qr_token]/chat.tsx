'use client';
import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type Msg = { role: 'guest' | 'assistant'; content: string };

export function Chat() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    const text = input.trim();
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-text-muted">{t.chat.empty}</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'guest' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={
                'animate-rise max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ' +
                (m.role === 'guest'
                  ? 'rounded-br-md bg-brand text-text-invert'
                  : 'rounded-bl-md bg-black/5 text-text')
              }
            >
              {m.content || <span className="opacity-50">…</span>}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <Textarea
          className="max-h-32 min-h-11 flex-1 resize-none py-2.5"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={t.chat.placeholder}
        />
        <Button onClick={send} disabled={sending || !input.trim()} className="px-4">
          {t.chat.send}
        </Button>
      </div>
    </div>
  );
}