import 'server-only';
import { and, eq, lt, lte } from 'drizzle-orm';
import type { DB } from './db/client';
import * as s from './db/schema';
import { closeWave } from './services/waves';

/**
 * Periyodik bakım işleri (idempotent; birden çok kez çalışması güvenlidir):
 *  1. Kapanış saati geçen açık dalgaları kapatır → kademe iadeleri yazılır.
 *  2. Teslim tarihi geçen kapalı dalgaları "teslim edildi" yapar.
 *  3. Vadesi geçen ödemeleri "gecikmiş" olarak işaretler.
 *
 * Çalıştırma: uzun ömürlü sunucuda (next start / docker) dakikada bir otomatik;
 * sunucusuz ortamda (Vercel) /api/v1/cron/maintenance uç noktası zamanlanmış görevle çağrılır.
 */
export async function runMaintenance(db: DB, now: Date = new Date()) {
  const expired = await db
    .select({ id: s.waves.id, title: s.waves.title })
    .from(s.waves)
    .where(and(eq(s.waves.status, 'open'), lte(s.waves.cutoffAt, now)));
  const closed: { title: string; totalCredit: number }[] = [];
  for (const w of expired) {
    try {
      const r = await closeWave(db, w.id);
      closed.push({ title: w.title, totalCredit: r.totalCredit });
    } catch (e) {
      // Başka bir süreç aynı anda kapatmış olabilir — sorun değil.
      if (!(e instanceof Error && /zaten kapalı/.test(e.message))) throw e;
    }
  }
  const delivered = await db
    .update(s.waves)
    .set({ status: 'delivered' })
    .where(and(eq(s.waves.status, 'closed'), lte(s.waves.deliveryAt, now)))
    .returning({ id: s.waves.id });
  const overdue = await db
    .update(s.orders)
    .set({ paymentStatus: 'overdue' })
    .where(and(eq(s.orders.paymentStatus, 'due'), lt(s.orders.dueAt, now)))
    .returning({ id: s.orders.id });
  return { closedWaves: closed, deliveredWaves: delivered.length, overdueOrders: overdue.length };
}

const g = globalThis as unknown as { __havuzScheduler?: ReturnType<typeof setInterval> };

/** Uzun ömürlü Node sürecinde dakikada bir bakım. HAVUZ_SCHEDULER=off ile kapatılır. */
export function startScheduler(db: DB) {
  if (g.__havuzScheduler || process.env.HAVUZ_SCHEDULER === 'off') return;
  const tick = () =>
    runMaintenance(db)
      .then((r) => {
        if (r.closedWaves.length || r.overdueOrders) console.info('[havuz:bakım]', JSON.stringify(r));
      })
      .catch((e) => console.error('[havuz:bakım] hata', e));
  void tick();
  g.__havuzScheduler = setInterval(tick, 60_000);
  g.__havuzScheduler.unref?.();
}
