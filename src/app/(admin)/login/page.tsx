'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { I18nProvider, useI18n } from '@/lib/i18n/context';
import { LocaleToggle } from '@/components/locale-toggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <I18nProvider initialLocale="el">
      <LoginInner />
    </I18nProvider>
  );
}

function LoginInner() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  async function signIn() {
    setStatus('loading');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setStatus('error'); return; }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center p-5">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-brand-bright/20 blur-3xl" />
        <div className="absolute -bottom-10 right-1/4 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="absolute right-4 top-4 z-10"><LocaleToggle /></div>

      <div className="animate-rise z-10 flex w-full max-w-sm flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-3">
          <Image src="/nestia-symbol.svg" alt="Nestia AI" width={170} height={159} priority className="drop-shadow-2xl" />
          <span className="text-2xl font-bold tracking-wide text-text-invert">
            Nestia <span className="text-accent">AI</span>
          </span>
        </div>

        <Card className="w-full">
          <div className="mb-5 text-center">
            <h1 className="text-xl font-bold text-text">{t.auth.title}</h1>
            <p className="mt-1 text-sm text-text-muted">{t.auth.subtitle}</p>
          </div>

          <div className="flex flex-col gap-3">
            <Input
              type="email"
              placeholder={t.auth.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && signIn()}
            />
            <Input
              type="password"
              placeholder={t.auth.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && signIn()}
            />
            <Button onClick={signIn} disabled={status === 'loading'} className="mt-1 w-full">
              {status === 'loading' ? t.auth.signingIn : t.auth.signIn}
            </Button>
            {status === 'error' && <p className="text-center text-sm text-danger">{t.auth.error}</p>}
          </div>
        </Card>
      </div>
    </main>
  );
}