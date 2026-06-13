'use client';
import { useEffect, useState } from 'react';
import { I18nProvider, useI18n } from '@/lib/i18n/context';
import { LocaleToggle } from '@/components/locale-toggle';
import { ComplaintForm } from './complaint-form';
import { Card } from '@/components/ui/card';

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

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-5">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-bright/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="absolute right-4 top-4 z-10"><LocaleToggle /></div>

      {state === 'loading' && (
        <p className="z-10 text-text-invert-muted">{t.session.connecting}</p>
      )}

      {state === 'error' && (
        <Card className="animate-rise z-10 w-full max-w-sm text-center">
          <p className="text-text-muted">{t.session.invalid}</p>
        </Card>
      )}

      {state === 'ready' && (
        <div className="animate-rise z-10 flex w-full max-w-sm flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-text-invert">{t.welcome}</h1>
            <span className="rounded-full border border-border-dark bg-surface-2/60 px-4 py-1 text-sm text-text-invert-muted">
              {t.room} {roomLabel}
            </span>
          </div>
          <Card className="w-full">
            <ComplaintForm />
          </Card>
        </div>
      )}
    </main>
  );
}