import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import type { ApiErrorBody } from '@havuz/core';
import { getDb, type DB } from './db/client';
import { readSession } from './auth/session';
import type { Role, SessionPayload } from './auth/secret';

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Kayıt') => new AppError(404, 'not_found', `${what} bulunamadı`);
export const forbidden = () => new AppError(403, 'forbidden', 'Bu işlem için yetkiniz yok');
export const badRequest = (message: string, details?: unknown) => new AppError(400, 'bad_request', message, details);

function errorResponse(e: unknown) {
  if (e instanceof AppError) {
    return NextResponse.json<ApiErrorBody>({ error: { code: e.code, message: e.message, details: e.details } }, { status: e.status });
  }
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return NextResponse.json<ApiErrorBody>(
      { error: { code: 'validation_error', message: first?.message ?? 'Geçersiz istek', details: e.flatten() } },
      { status: 422 },
    );
  }
  console.error('[api]', e);
  return NextResponse.json<ApiErrorBody>({ error: { code: 'internal', message: 'Sunucu hatası' } }, { status: 500 });
}

interface Ctx<P> {
  req: Request;
  params: P;
  db: DB;
}
interface AuthedCtx<P> extends Ctx<P> {
  session: SessionPayload;
}

type RouteCtx<P> = { params: P };

/** Herkese açık uç nokta. */
export function publicRoute<P = Record<string, string>>(fn: (ctx: Ctx<P>) => Promise<unknown>) {
  return async (req: Request, { params }: RouteCtx<P>) => {
    try {
      const db = await getDb();
      const out = await fn({ req, params, db });
      return out instanceof Response ? out : NextResponse.json(out);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

/** Oturum ve rol kontrollü uç nokta. */
export function route<P = Record<string, string>>(roles: Role[], fn: (ctx: AuthedCtx<P>) => Promise<unknown>) {
  return async (req: Request, { params }: RouteCtx<P>) => {
    try {
      const session = await readSession();
      if (!session) throw new AppError(401, 'unauthorized', 'Oturum açmanız gerekiyor');
      if (!roles.includes(session.role)) throw forbidden();
      const db = await getDb();
      const out = await fn({ req, params, db, session });
      return out instanceof Response ? out : NextResponse.json(out);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  const json = await req.json().catch(() => {
    throw badRequest('Geçersiz JSON gövdesi');
  });
  return schema.parse(json);
}

/**
 * Süreç içi hız sınırlayıcı (tek sunucu için). Çok sunuculu kurulumda aynı arayüzle Redis'e taşınır.
 * `rateLimit` her çağrıyı sayar; `assertNotLimited` + `recordFailure` yalnızca başarısız denemeleri sayar.
 */
const buckets = new Map<string, { n: number; reset: number }>();
function bucket(key: string, windowMs: number) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) {
    b = { n: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  if (buckets.size > 50_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  return b;
}
const limited = () => new AppError(429, 'rate_limited', 'Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.');

export function rateLimit(key: string, limit: number, windowMs: number) {
  if (++bucket(key, windowMs).n > limit) throw limited();
}
export function assertNotLimited(key: string, limit: number, windowMs: number) {
  if (bucket(key, windowMs).n >= limit) throw limited();
}
export function recordFailure(key: string, windowMs: number) {
  bucket(key, windowMs).n++;
}

/**
 * İstemci IP'si. X-Forwarded-For'un ilk değeri istemci tarafından uydurulabilir; bu yüzden
 * önce proxy'nin yazdığı x-real-ip, yoksa zincirdeki son (güvenilir proxy'nin eklediği) değer kullanılır.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',').pop()!.trim();
  return 'local';
}
