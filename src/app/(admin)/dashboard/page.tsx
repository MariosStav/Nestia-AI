import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // RLS scopes this to the staff's own hotel automatically.
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, category, guest_message, status, created_at, rooms ( label )')
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Παράπονα</h1>
      {(!tickets || tickets.length === 0) && <p className="text-gray-600">Κανένα παράπονο ακόμα.</p>}
      <ul className="flex flex-col gap-3">
        {tickets?.map((t) => (
          <li key={t.id} className="rounded-lg border p-4">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Δωμάτιο {(t.rooms as unknown as { label: string }[] | null)?.[0]?.label ?? '—'} · {t.category}</span>
              <span>{t.status}</span>
            </div>
            <p className="mt-1">{t.guest_message}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}