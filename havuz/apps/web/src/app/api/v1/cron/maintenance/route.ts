import { NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { runMaintenance } from '@/server/jobs';

export const dynamic = 'force-dynamic';

/**
 * Sunucusuz kurulumlar için zamanlanmış bakım tetikleyicisi.
 * Authorization: Bearer <CRON_SECRET> zorunludur (Vercel Cron bu başlığı kendisi gönderir).
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Yetkisiz' } }, { status: 401 });
  }
  return NextResponse.json(await runMaintenance(await getDb()));
}

export const GET = handle;
export const POST = handle;
