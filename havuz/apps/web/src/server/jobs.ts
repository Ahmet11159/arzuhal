import 'server-only';
import { and, eq, gt, lt, lte, notExists } from 'drizzle-orm';
import { formatTRY } from '@havuz/core';
import type { DB } from './db/client';
import * as s from './db/schema';
import { closeWave } from './services/waves';
import { expireUnpaidOrders } from './services/payments';
import { flushOutbox } from './channels';
import { notify } from './notify';
import { SYSTEM } from './audit';

const DAY = 86_400_000;

/**
 * Periyodik bakım işleri (idempotent; birden çok kez çalışması güvenlidir):
 *  1. Ödeme süresi dolan peşin siparişleri iptal eder (stok ve kredi iade).
 *  2. Kapanış saati geçen açık dalgaları kapatır → kademe iadeleri yazılır.
 *  3. Teslim tarihi geçen kapalı dalgaları "teslim edildi" yapar.
 *  4. Vadesi geçen ödemeleri "gecikmiş" olarak işaretler ve üyeye bildirir.
 *  5. Hatırlatmalar: vadesi 3 gün içinde dolacak borçlar, 24 saat içinde kapanacak dalga.
 *  6. E-posta / WhatsApp kuyruğunu gönderir.
 */
export async function runMaintenance(db: DB, now: Date = new Date()) {
  const expiredOrders = await expireUnpaidOrders(db, now);

  const expired = await db
    .select({ id: s.waves.id, title: s.waves.title })
    .from(s.waves)
    .where(and(eq(s.waves.status, 'open'), lte(s.waves.cutoffAt, now)));
  const closed: { title: string; totalCredit: number }[] = [];
  for (const w of expired) {
    try {
      const r = await closeWave(db, w.id, SYSTEM);
      closed.push({ title: w.title, totalCredit: r.totalCredit });
    } catch (e) {
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
    .returning({ id: s.orders.id, memberId: s.orders.memberId, number: s.orders.number, total: s.orders.total });

  let reminders = 0;
  await db.transaction(async (tx) => {
    for (const o of overdue) {
      if (
        await notify(tx, {
          orgId: o.memberId,
          type: 'payment.overdue',
          title: `Vadesi geçti: ${o.number}`,
          body: `${formatTRY(o.total)} tutarındaki ödemenin vadesi doldu. Vadeli limitinizin açık kalması için lütfen ödeyin.`,
          link: '/uye/hesap',
          dedupeKey: `payment.overdue:${o.id}`,
          email: true,
          whatsapp: true,
        })
      )
        reminders++;
    }
    const dueSoon = await tx
      .select({ id: s.orders.id, memberId: s.orders.memberId, number: s.orders.number, total: s.orders.total, dueAt: s.orders.dueAt })
      .from(s.orders)
      .where(and(eq(s.orders.paymentStatus, 'due'), gt(s.orders.dueAt, now), lte(s.orders.dueAt, new Date(now.getTime() + 3 * DAY))));
    for (const o of dueSoon) {
      if (
        await notify(tx, {
          orgId: o.memberId,
          type: 'payment.due_soon',
          title: `Vade yaklaşıyor: ${o.number}`,
          body: `${formatTRY(o.total)} ödemenin vadesi ${new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(o.dueAt!)}.`,
          link: '/uye/hesap',
          dedupeKey: `payment.due_soon:${o.id}`,
          email: true,
        })
      )
        reminders++;
    }
    // 24 saat içinde kapanacak dalga: henüz sipariş vermemiş aktif üyelere hatırlatma.
    const closing = await tx
      .select()
      .from(s.waves)
      .where(and(eq(s.waves.status, 'open'), gt(s.waves.cutoffAt, now), lte(s.waves.cutoffAt, new Date(now.getTime() + DAY))));
    for (const w of closing) {
      const idle = await tx
        .select({ id: s.organizations.id })
        .from(s.organizations)
        .where(
          and(
            eq(s.organizations.type, 'member'),
            eq(s.organizations.active, true),
            notExists(tx.select({ x: s.orders.id }).from(s.orders).where(and(eq(s.orders.memberId, s.organizations.id), eq(s.orders.waveId, w.id)))),
          ),
        );
      for (const m of idle) {
        if (
          await notify(tx, {
            orgId: m.id,
            type: 'wave.closing',
            title: `${w.title} yarın kapanıyor`,
            body: 'Henüz dalgaya katılmadınız. Düzenli alımlarınızı havuz fiyatından almak için son saatler.',
            link: '/uye/dalga',
            dedupeKey: `wave.closing:${w.id}:${m.id}`,
            whatsapp: true,
          })
        )
          reminders++;
      }
    }
  });

  const outbox = await flushOutbox(db);
  return { expiredOrders, closedWaves: closed, deliveredWaves: delivered.length, overdueOrders: overdue.length, reminders, outbox };
}

const g = globalThis as unknown as { __havuzScheduler?: ReturnType<typeof setInterval> };

/** Uzun ömürlü Node sürecinde dakikada bir bakım. HAVUZ_SCHEDULER=off ile kapatılır. */
export function startScheduler(db: DB) {
  if (g.__havuzScheduler || process.env.HAVUZ_SCHEDULER === 'off') return;
  const tick = () =>
    runMaintenance(db)
      .then((r) => {
        if (r.closedWaves.length || r.overdueOrders || r.expiredOrders || r.outbox.failed) console.info('[havuz:bakım]', JSON.stringify(r));
      })
      .catch((e) => console.error('[havuz:bakım] hata', e));
  void tick();
  g.__havuzScheduler = setInterval(tick, 60_000);
  g.__havuzScheduler.unref?.();
}

