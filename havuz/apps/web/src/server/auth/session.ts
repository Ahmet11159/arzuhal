import 'server-only';
import { jwtVerify, SignJWT } from 'jose';
import { cookies, headers } from 'next/headers';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, sessionSecret, type SessionPayload } from './secret';

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ org: payload.org, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionSecret());
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ['HS256'] });
    if (!payload.sub || typeof payload.org !== 'string' || typeof payload.role !== 'string') return null;
    return { sub: payload.sub, org: payload.org, role: payload.role as SessionPayload['role'] };
  } catch {
    return null;
  }
}

/** Önce Authorization: Bearer (mobil), sonra httpOnly çerez (web). */
export async function readSession(): Promise<SessionPayload | null> {
  const auth = headers().get('authorization');
  if (auth?.startsWith('Bearer ')) return verifySession(auth.slice(7));
  return verifySession(cookies().get(SESSION_COOKIE)?.value);
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}
