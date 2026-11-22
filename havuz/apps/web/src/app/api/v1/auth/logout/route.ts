import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  clearSessionCookie();
  return new NextResponse(null, { status: 204 });
}
