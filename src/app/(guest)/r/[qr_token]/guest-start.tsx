'use client';
import { useEffect, useState } from 'react';

export function GuestStart({ qrToken }: { qrToken: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [roomLabel, setRoomLabel] = useState('');

  useEffect(() => {
    fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrToken }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) { setRoomLabel(d.room.label); setState('ready'); }
        else setState('error');
      })
      .catch(() => setState('error'));
  }, [qrToken]);

  if (state === 'loading')
    return <main className="flex min-h-screen items-center justify-center">Σύνδεση…</main>;
  if (state === 'error')
    return <main className="flex min-h-screen items-center justify-center">Μη έγκυρος κωδικός δωματίου.</main>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6">
      <h1 className="text-2xl font-bold">Καλώς ήρθατε</h1>
      <p className="text-gray-600">Δωμάτιο {roomLabel}</p>
      {/* Εδώ μπαίνει το complaint form στο επόμενο κομμάτι */}
    </main>
  );
}