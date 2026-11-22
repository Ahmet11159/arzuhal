import { NextResponse } from 'next/server';
import { assertNotLimited, clientIp, publicRoute, recordFailure, AppError } from '@/server/http';
import { login } from '@/server/services/auth';
import { setSessionCookie } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

export const POST = publicRoute(async ({ req, db }) => {
  const body = await req.json().catch(() => ({}));
  const WINDOW = 15 * 60_000;
  const ipKey = `login:ip:${clientIp(req)}`;
  const emailKey = `login:email:${String((body as { email?: unknown }).email ?? '').trim().toLowerCase()}`;
  // Yalnızca başarısız denemeler sayılır: IP başına 50, hesap başına 8 (15 dakikada).
  assertNotLimited(ipKey, 50, WINDOW);
  assertNotLimited(emailKey, 8, WINDOW);
  let result;
  try {
    result = await login(db, body);
  } catch (e) {
    if (e instanceof AppError && e.status === 401) {
      recordFailure(ipKey, WINDOW);
      recordFailure(emailKey, WINDOW);
    }
    throw e;
  }
  setSessionCookie(result.token);
  return NextResponse.json(result);
});
