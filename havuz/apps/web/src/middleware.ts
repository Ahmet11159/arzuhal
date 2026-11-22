import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { CHANGE_PASSWORD_PATH, ROLE_HOME, SESSION_COOKIE, sessionSecret, type Role } from './server/auth/secret';

/**
 * Uygulama alanlarını role göre korur. API uç noktaları kendi yetki kontrolünü ayrıca yapar
 * (token sürümü, hesap aktifliği veritabanından doğrulanır).
 */
const AREAS: { prefix: string; role: Role }[] = [
  { prefix: '/uye', role: 'member' },
  { prefix: '/odeme', role: 'member' },
  { prefix: '/tedarikci', role: 'supplier' },
  { prefix: '/yonetim', role: 'admin' },
];

async function sessionFrom(req: NextRequest): Promise<{ role: Role; mcp: boolean } | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ['HS256'] });
    return payload.role ? { role: payload.role as Role, mcp: payload.mcp === true } : null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await sessionFrom(req);

  if (pathname === CHANGE_PASSWORD_PATH) {
    if (!session) return NextResponse.redirect(new URL('/giris', req.url));
    return NextResponse.next();
  }
  if (pathname === '/giris' && session) {
    return NextResponse.redirect(new URL(session.mcp ? CHANGE_PASSWORD_PATH : ROLE_HOME[session.role], req.url));
  }
  const area = AREAS.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  if (!area) return NextResponse.next();
  if (!session) {
    const url = new URL('/giris', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  // Geçici şifreyle giriş yapan kullanıcı önce kendi şifresini belirler.
  if (session.mcp) return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, req.url));
  if (session.role !== area.role) return NextResponse.redirect(new URL(ROLE_HOME[session.role], req.url));
  return NextResponse.next();
}

export const config = { matcher: ['/giris', '/sifre-degistir', '/uye/:path*', '/odeme/:path*', '/tedarikci/:path*', '/yonetim/:path*'] };
