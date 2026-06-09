import 'server-only';
import { createAdminClient } from '@/lib/db/admin';
import { getActiveSession } from './session.service';

const VALID_CATEGORIES = ['cleanliness', 'noise', 'maintenance', 'food', 'service', 'other'] as const;
type Category = (typeof VALID_CATEGORIES)[number];

export async function createComplaint(params: { category: string; message: string }) {
  const session = await getActiveSession();
  if (!session) return { ok: false as const, error: 'invalid_session' };

  const message = params.message?.trim();
  if (!message) return { ok: false as const, error: 'empty_message' };

  // Never trust the client category — whitelist server-side.
  const category: Category = VALID_CATEGORIES.includes(params.category as Category)
    ? (params.category as Category)
    : 'other';

  const db = createAdminClient();
  const { data: ticket, error } = await db
    .from('tickets')
    .insert({
      hotel_id: session.hotel_id, // resolved from session, in one place
      room_id: session.room_id,
      session_id: session.id,
      source: 'complaint_form',
      category,
      guest_message: message,
      // urgency → 'normal', status → 'open', sentiment → null (no AI yet) come from schema defaults
    })
    .select('id')
    .single();

  if (error || !ticket) return { ok: false as const, error: 'ticket_create_failed' };
  return { ok: true as const, ticketId: ticket.id };
}