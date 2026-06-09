'use client';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
const CATEGORIES = ['cleanliness', 'noise', 'maintenance', 'food', 'service', 'other'] as const;

export function ComplaintForm() {
  const { t } = useI18n();
  const [category, setCategory] = useState('cleanliness');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function submit() {
    if (!message.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message }),
      });
      const d = await res.json();
      setStatus(d.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent')
    return (
      <div className="w-full max-w-sm rounded-lg border p-4 text-center">
        <p className="font-medium">{t.complaint.sentTitle}</p>
        <p className="text-sm text-gray-600">{t.complaint.sentBody}</p>
      </div>
    );

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <label className="text-sm font-medium">{t.complaint.category}</label>
      <select className="rounded-md border p-2" value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{t.complaint.categories[c]}</option>
        ))}
      </select>

      <label className="text-sm font-medium">{t.complaint.message}</label>
      <textarea
        className="min-h-24 rounded-md border p-2"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t.complaint.placeholder}
      />

      <button
        onClick={submit}
        disabled={status === 'sending' || !message.trim()}
        className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {status === 'sending' ? t.complaint.sending : t.complaint.submit}
      </button>

      {status === 'error' && <p className="text-sm text-red-600">{t.complaint.error}</p>}
    </div>
  );
}