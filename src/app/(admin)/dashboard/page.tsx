import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { TicketList } from './ticket-list';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, category, guest_message, status, created_at, rooms ( label )')
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Παράπονα</h1>
      <TicketList initialTickets={tickets ?? []} />
    </main>
  );
}