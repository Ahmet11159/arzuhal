import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { ROLE_HOME, SESSION_COOKIE, sessionSecret, type Role } from './server/auth/secret';

/** Uygulama alanlarını role göre korur. API uç noktaları kendi yetki kontrolünü yapar. */
const AREAS: { prefix: string; role: Role }[] = [
  { prefix: '/uye', role: 'member' },
  { prefix: '/tedarikci', role: 'supplier' },
  { prefix: '/yonetim', role: 'admin' },
];

async function roleFrom(req: NextRequest): Promise<Role | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ['HS256'] });
    return (payload.role as Role) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = await roleFrom(req);

  if (pathname === '/giris' && role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
  }
  const area = AREAS.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  if (!area) return NextResponse.next();
  if (!role) {
    const url = new URL('/giris', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (role !== area.role) return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
  return NextResponse.next();
}

export const config = { matcher: ['/giris', '/uye/:path*', '/tedarikci/:path*', '/yonetim/:path*'] };
