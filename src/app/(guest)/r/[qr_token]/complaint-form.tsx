'use client';
import { useState } from 'react';

const CATEGORIES = [
  { value: 'cleanliness', label: 'Καθαριότητα' },
  { value: 'noise', label: 'Θόρυβος' },
  { value: 'maintenance', label: 'Βλάβη / Συντήρηση' },
  { value: 'food', label: 'Φαγητό' },
  { value: 'service', label: 'Εξυπηρέτηση' },
  { value: 'other', label: 'Άλλο' },
];

export function ComplaintForm() {
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
        <p className="font-medium">Ευχαριστούμε.</p>
        <p className="text-sm text-gray-600">Το μήνυμά σας στάλθηκε στο προσωπικό.</p>
      </div>
    );

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <label className="text-sm font-medium">Κατηγορία</label>
      <select className="rounded-md border p-2" value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      <label className="text-sm font-medium">Το μήνυμά σας</label>
      <textarea
        className="min-h-24 rounded-md border p-2"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Περιγράψτε το πρόβλημα…"
      />

      <button
        onClick={submit}
        disabled={status === 'sending' || !message.trim()}
        className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {status === 'sending' ? 'Αποστολή…' : 'Αποστολή'}
      </button>

      {status === 'error' && <p className="text-sm text-red-600">Κάτι πήγε στραβά. Δοκιμάστε ξανά.</p>}
    </div>
  );
}