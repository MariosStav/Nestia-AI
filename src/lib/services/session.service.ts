import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/db/admin';

const SESSION_COOKIE = 'nestia_session';
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48h safety net

// Called from the QR landing. Reuses the existing cookie session when it is
// still active, belongs to the same room, and is within the 48h window.
// Only creates a new session when none of those conditions hold.
export async function getOrCreateSession(qrToken: string) {
  const db = createAdminClient();

  const { data: room } = await db
    .from('rooms')
    .select('id, hotel_id, label, is_active')
    .eq('qr_token', qrToken)
    .single();

  if (!room || !room.is_active) return { ok: false as const, error: 'invalid_qr' };

  // Try to reuse an existing session from the browser cookie.
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const { data: existing } = await db
      .from('guest_sessions')
      .select('id, hotel_id, room_id, session_token, status, started_at')
      .eq('session_token', token)
      .single();

    if (
      existing &&
      existing.status === 'active' &&
      existing.room_id === room.id &&
      Date.now() - new Date(existing.started_at).getTime() <= MAX_AGE_MS
    ) {
      return { ok: true as const, session: existing, room, isNew: false };
    }
  }

  // No valid session — create one.
  const sessionToken = randomBytes(32).toString('base64url');

  const { data: session } = await db
    .from('guest_sessions')
    .insert({
      hotel_id: room.hotel_id,
      room_id: room.id,
      session_token: sessionToken,
      status: 'active',
    })
    .select('id, hotel_id, room_id, session_token')
    .single();

  if (!session) return { ok: false as const, error: 'session_create_failed' };

  return { ok: true as const, session, room, isNew: true };
}

// Called by every later guest request to validate the cookie.
export async function getActiveSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = createAdminClient();
  const { data: session } = await db
    .from('guest_sessions')
    .select('id, hotel_id, room_id, status, started_at, locale')
    .eq('session_token', token)
    .single();

  if (!session || session.status !== 'active') return null;
  if (Date.now() - new Date(session.started_at).getTime() > MAX_AGE_MS) return null;

  return session;
}

export { SESSION_COOKIE };
