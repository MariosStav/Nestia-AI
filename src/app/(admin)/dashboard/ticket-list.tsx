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

const statusStyle: Record<string, string> = {
  open: 'bg-danger/10 text-danger',
  acknowledged: 'bg-brand/10 text-brand',
  resolved: 'bg-success/10 text-success',
  dismissed: 'bg-black/5 text-text-muted',
};

export function TicketList({ initialTickets }: { initialTickets: Ticket[] }) {
  const { t } = useI18n();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('tickets-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTickets((prev) => [payload.new as Ticket, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTickets((prev) =>
            prev.map((tk) => (tk.id === (payload.new as Ticket).id ? { ...tk, ...(payload.new as Ticket) } : tk))
          );
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function setStatus(id: string, status: string) {
    const prev = tickets;
    setTickets((cur) => cur.map((tk) => (tk.id === id ? { ...tk, status } : tk))); // optimistic
    const { error } = await createClient().from('tickets').update({ status }).eq('id', id);
    if (error) setTickets(prev); // revert on failure
  }

  const fmt = new Intl.DateTimeFormat('el-GR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const cat = (c: string) => (t.complaint.categories as Record<string, string>)[c] ?? c;
  const stat = (s: string) => (t.admin.status as Record<string, string>)[s] ?? s;

  return (
    <section>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-text">{t.admin.complaintsTitle}</h1>
        <p className="mt-1 text-sm text-text-muted">{t.admin.subtitle}</p>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-card border border-border bg-surface-2 p-10 text-center text-text-muted [box-shadow:var(--shadow-soft)]">
          {t.admin.empty}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((tk) => (
            <li key={tk.id} className="animate-rise rounded-card border border-border bg-surface-2 p-5 [box-shadow:var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-text">{t.admin.room} {roomLabel(tk.rooms)}</span>
                  <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs text-text-muted">{cat(tk.category)}</span>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[tk.status] ?? ''}`}>
                  {stat(tk.status)}
                </span>
              </div>

              <p className="mt-2 text-text">{tk.guest_message}</p>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-text-muted">{fmt.format(new Date(tk.created_at))}</span>
                <div className="flex gap-2">
                  {tk.status === 'open' && (
                    <button onClick={() => setStatus(tk.id, 'acknowledged')}
                      className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/10">
                      {t.admin.actions.acknowledge}
                    </button>
                  )}
                  {tk.status !== 'resolved' && (
                    <button onClick={() => setStatus(tk.id, 'resolved')}
                      className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90">
                      {t.admin.actions.resolve}
                    </button>
                  )}
                  {tk.status === 'resolved' && (
                    <button onClick={() => setStatus(tk.id, 'open')}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-black/5">
                      {t.admin.actions.reopen}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}