'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useI18n } from '@/lib/i18n/context';

type Ticket = {
  id: string;
  category: string;
  guest_message: string;
  status: string;
  created_at: string;
  rooms: { label: string }[] | { label: string } | null;
};

function roomLabel(rooms: Ticket['rooms']) {
  if (!rooms) return '—';
  return Array.isArray(rooms) ? rooms[0]?.label ?? '—' : rooms.label;
}

export function TicketList({ initialTickets }: { initialTickets: Ticket[] }) {
  const { t } = useI18n();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('tickets-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        (payload) => {
          // RLS applies to realtime too — only this hotel's inserts arrive.
          setTickets((prev) => [payload.new as Ticket, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (tickets.length === 0)
    return <p className="text-gray-600">Κανένα παράπονο ακόμα.</p>;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">{t.admin.complaintsTitle}</h1>
      {tickets.length === 0 ? (
        <p className="text-gray-600">{t.admin.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((tk) => (
            <li key={tk.id} className="rounded-lg border p-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>{t.admin.room} {roomLabel(tk.rooms)} · {tk.category}</span>
                <span>{t.admin.status[tk.status as keyof typeof t.admin.status] ?? tk.status}</span>
              </div>
              <p className="mt-1">{tk.guest_message}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}