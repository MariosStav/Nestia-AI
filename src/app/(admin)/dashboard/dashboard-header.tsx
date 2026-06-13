'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useI18n } from '@/lib/i18n/context';

export function DashboardHeader() {
  const { t } = useI18n();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-border pb-4">
      <div className="flex items-center gap-2.5">
        <Image src="/nestia-symbol.svg" alt="" width={36} height={34} />
        <span className="text-lg font-bold text-text">Nestia <span className="text-accent-strong">AI</span></span>
      </div>
      <button onClick={signOut} className="rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-black/5 hover:text-text">
        {t.admin.signOut}
      </button>
    </header>
  );
}