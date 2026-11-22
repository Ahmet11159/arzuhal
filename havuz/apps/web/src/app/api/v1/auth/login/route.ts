import { NextResponse } from 'next/server';
import { clientIp, publicRoute, rateLimit } from '@/server/http';
import { login } from '@/server/services/auth';
import { setSessionCookie } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

export const POST = publicRoute(async ({ req, db }) => {
  rateLimit(`login:${clientIp(req)}`, 10, 60_000);
  const result = await login(db, await req.json().catch(() => ({})));
  setSessionCookie(result.token);
  return NextResponse.json(result);
});
