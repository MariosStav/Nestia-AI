'use client';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

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
      <div className="animate-pop flex flex-col items-center gap-2 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-2xl text-success">
          ✓
        </div>
        <p className="text-lg font-semibold text-text">{t.complaint.sentTitle}</p>
        <p className="text-sm text-text-muted">{t.complaint.sentBody}</p>
      </div>
    );

  const options = CATEGORIES.map((c) => ({ value: c, label: t.complaint.categories[c] }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text">{t.complaint.category}</label>
        <Select value={category} options={options} onChange={setCategory} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text">{t.complaint.message}</label>
        <Textarea
          className="min-h-28"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.complaint.placeholder}
        />
      </div>

      <Button onClick={submit} disabled={status === 'sending' || !message.trim()}>
        {status === 'sending' ? t.complaint.sending : t.complaint.submit}
      </Button>

      {status === 'error' && <p className="text-sm text-danger">{t.complaint.error}</p>}
    </div>
  );
}