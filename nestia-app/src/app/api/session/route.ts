import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { startSessionForQr, SESSION_COOKIE } from '@/lib/services/session.service';

export async function POST(req: NextRequest) {
  const { qrToken } = await req.json();
  if (!qrToken) return NextResponse.json({ ok: false, error: 'missing_qr' }, { status: 400 });

  const result = await startSessionForQr(qrToken);
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, result.session.session_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 48 * 60 * 60,
  });

  // Token never leaves in the body — only what the UI needs.
  return NextResponse.json({ ok: true, room: { label: result.room.label } });
}