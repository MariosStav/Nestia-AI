'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function signIn() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError('Λάθος στοιχεία.'); return; }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="text-xl font-bold">Nestia — Είσοδος προσωπικού</h1>
        <input className="rounded-md border p-2" type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded-md border p-2" type="password" placeholder="Κωδικός"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={signIn} className="rounded-md bg-black px-4 py-2 text-white">Είσοδος</button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}