'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

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
    <ul className="flex flex-col gap-3">
      {tickets.map((t) => (
        <li key={t.id} className="rounded-lg border p-4">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Δωμάτιο {roomLabel(t.rooms)} · {t.category}</span>
            <span>{t.status}</span>
          </div>
          <p className="mt-1">{t.guest_message}</p>
        </li>
      ))}
    </ul>
  );
}