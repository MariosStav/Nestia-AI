import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { I18nProvider } from '@/lib/i18n/context';
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
    <I18nProvider initialLocale="el">
      <TicketList initialTickets={tickets ?? []} />
    </I18nProvider>
  );
}