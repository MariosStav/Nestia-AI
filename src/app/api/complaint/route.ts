import { NextRequest, NextResponse } from 'next/server';
import { createComplaint } from '@/lib/services/ticket.service';

export async function POST(req: NextRequest) {
  const { category, message } = await req.json();
  const result = await createComplaint({ category, message });
  if (!result.ok) {
    const status = result.error === 'invalid_session' ? 401 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json({ ok: true });
}