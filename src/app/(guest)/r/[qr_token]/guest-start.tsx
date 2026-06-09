'use client';
import { useEffect, useState } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n/context';
import { LocaleToggle } from '@/components/locale-toggle';
import { ComplaintForm } from './complaint-form';

export function GuestStart({ qrToken }: { qrToken: string }) {
  return (
    <I18nProvider>
      <GuestStartInner qrToken={qrToken} />
    </I18nProvider>
  );
}

function GuestStartInner({ qrToken }: { qrToken: string }) {
  const { t } = useI18n();
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
    return <main className="flex min-h-screen items-center justify-center">{t.session.connecting}</main>;
  if (state === 'error')
    return <main className="flex min-h-screen items-center justify-center">{t.session.invalid}</main>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <div className="absolute right-4 top-4"><LocaleToggle /></div>
      <h1 className="text-2xl font-bold">{t.welcome}</h1>
      <p className="text-gray-600">{t.room} {roomLabel}</p>
      <ComplaintForm />
    </main>
  );
}