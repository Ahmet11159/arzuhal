import 'server-only';
import { and, desc, eq, gt, inArray, ne } from 'drizzle-orm';
import { formatTRY } from '@havuz/core';
import {
  bestPossiblePrice,
  closeWave as closeWaveDomain,
  createWaveInput,
  type WaveDetailDTO,
  type WaveDTO,
  type WaveLine,
} from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import { badRequest, notFound } from '../http';
import { audit, SYSTEM, type Actor } from '../audit';
import { notify } from '../notify';
import { cancelUnpaidOrder } from './orders';
import { pooledForWave, toWaveDTO, waveOfferState, waveStats } from './common';

export async function listWaves(db: DB): Promise<WaveDTO[]> {
  const rows = await db.select().from(s.waves).orderBy(desc(s.waves.cutoffAt)).limit(30);
  const st = await waveStats(db, rows.map((w) => w.id));
  return rows.map((w) => toWaveDTO(w, st[w.id]));
}

export async function getWave(db: DB, id: string): Promise<WaveDetailDTO> {
  const w = await db.query.waves.findFirst({ where: eq(s.waves.id, id) });
  if (!w) throw notFound('Dalga');
  const st = await waveStats(db, [w.id]);
  const pooled = await pooledForWave(db, w.id);

  // Açık dalgada tüm aktif teklifler, kapalı dalgada yalnızca sipariş alanlar listelenir.
  const offerRows = await db.query.offers.findMany({
    where: w.status === 'open' ? eq(s.offers.active, true) : inArray(s.offers.id, Object.keys(pooled).length ? Object.keys(pooled) : ['-']),
    with: { product: { with: { category: true } }, supplier: true },
  });

  const offers = offerRows
    .map((o) => {
      const state = waveOfferState(o, pooled[o.id] ?? 0);
      return {
        offerId: o.id,
        productId: o.productId,
        productName: o.product.name,
        unit: o.product.unit,
        supplierName: o.supplier.name,
        categoryIcon: o.product.category.icon,
        pooledQty: state.pooledQty,
        basePrice: o.basePrice,
        currentPrice: state.currentPrice,
        bestPrice: bestPossiblePrice(o),
        next: state.next,
      };
    })
    .sort((a, b) => b.pooledQty - a.pooledQty || (b.next?.progress ?? 1) - (a.next?.progress ?? 1));

  return { ...toWaveDTO(w, st[w.id]), offers };
}

export async function createWave(db: DB, raw: unknown, actor: Actor = SYSTEM): Promise<WaveDTO> {
  const input = createWaveInput.parse(raw);
  if (input.cutoffAt <= new Date()) throw badRequest('Kapanış tarihi gelecekte olmalı');
  const [clash] = await db
    .select({ title: s.waves.title })
    .from(s.waves)
    .where(and(eq(s.waves.status, 'open'), eq(s.waves.region, input.region), gt(s.waves.cutoffAt, new Date())))
    .limit(1);
  if (clash) throw badRequest(`${input.region} bölgesinde zaten açık bir dalga var (${clash.title}). Önce onu kapatın.`);
  const [last] = await db.select({ code: s.waves.code }).from(s.waves).orderBy(desc(s.waves.cutoffAt)).limit(1);
  const n = last ? Number(last.code.replace(/\D/g, '')) + 1 : 1;
  const [w] = await db
    .insert(s.waves)
    .values({
      code: `#${n}`,
      title: input.title.includes('#') ? input.title : `${input.title} #${n}`,
      region: input.region,
      status: 'open',
      opensAt: new Date(),
      cutoffAt: input.cutoffAt,
      deliveryAt: input.deliveryAt,
    })
    .returning();
  const members = await db.select({ id: s.organizations.id }).from(s.organizations).where(and(eq(s.organizations.type, 'member'), eq(s.organizations.active, true)));
  await db.transaction(async (tx) => {
    for (const m of members) {
      await notify(tx, {
        orgId: m.id,
        type: 'wave.opened',
        title: `${w.title} açıldı`,
        body: `Sipariş alımı ${new Intl.DateTimeFormat('tr-TR', { weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(w.cutoffAt)}’e kadar açık. Havuz büyüdükçe fiyatlar düşer.`,
        link: '/uye/dalga',
        dedupeKey: `wave.opened:${w.id}:${m.id}`,
      });
    }
    await audit(tx, actor, 'wave.create', 'wave', w.id, `${w.title} açıldı (${w.region})`);
  });
  return toWaveDTO(w);
}

/**
 * Dalgayı kapatır: nihai kademeleri hesaplar, kalemlerin nihai fiyatlarını
 * günceller, farkı üyelere kredi olarak yazar. Tek transaction içinde, idempotent.
 */
export async function closeWave(db: DB, id: string, actor: Actor = SYSTEM) {
  return db.transaction(async (tx) => {
    // Satır kilidi: eşzamanlı ikinci kapanış ve kapanış sırasında yazılan siparişler sıraya girer.
    const [w] = await tx.select().from(s.waves).where(eq(s.waves.id, id)).for('update');
    if (!w) throw notFound('Dalga');
    if (w.status !== 'open') throw badRequest('Dalga zaten kapalı');

    // Ödemesi tamamlanmamış peşin siparişler havuza girmez: önce iptal edilir.
    const unpaid = await tx
      .select()
      .from(s.orders)
      .where(and(eq(s.orders.waveId, id), eq(s.orders.paymentStatus, 'unpaid'), ne(s.orders.status, 'cancelled')))
      .for('no key update');
    for (const o of unpaid) await cancelUnpaidOrder(tx, o, `${w.title} kapandı; ödemesi tamamlanmadığı için sipariş iptal edildi.`);

    const rows = await tx
      .select({
        lineId: s.orderItems.id,
        orderId: s.orderItems.orderId,
        memberId: s.orders.memberId,
        offerId: s.orderItems.offerId,
        qty: s.orderItems.qty,
        paidUnitPrice: s.orderItems.unitPrice,
        orderNumber: s.orders.number,
      })
      .from(s.orderItems)
      .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
      .where(and(eq(s.orders.waveId, id), ne(s.orderItems.status, 'cancelled')));

    const offerIds = [...new Set(rows.map((r) => r.offerId))];
    const offerRows = offerIds.length ? await tx.select().from(s.offers).where(inArray(s.offers.id, offerIds)) : [];
    const offers = Object.fromEntries(offerRows.map((o) => [o.id, o]));
    const result = closeWaveDomain(rows as WaveLine[], offers);

    for (const l of result.lines) {
      if (l.finalUnitPrice !== l.paidUnitPrice) {
        await tx.update(s.orderItems).set({ finalUnitPrice: l.finalUnitPrice }).where(eq(s.orderItems.id, l.lineId));
      }
    }
    const numbers = Object.fromEntries(rows.map((r) => [r.orderId, r.orderNumber]));
    for (const [orderId, credit] of Object.entries(result.creditsByOrder)) {
      const memberId = rows.find((r) => r.orderId === orderId)!.memberId;
      await tx.update(s.orders).set({ waveCredit: credit }).where(eq(s.orders.id, orderId));
      await tx.insert(s.ledgerEntries).values({
        orgId: memberId,
        type: 'wave_rebate',
        amount: credit,
        description: `${w.title} kademe farkı (${numbers[orderId]})`,
        refId: orderId,
      });
    }
    await tx
      .update(s.waves)
      .set({ status: 'closed', closedAt: new Date(), totalCredit: result.totalCredit })
      .where(eq(s.waves.id, id));

    for (const [memberId, credit] of Object.entries(result.creditsByMember)) {
      await notify(tx, {
        orgId: memberId,
        type: 'wave.rebate',
        title: `${w.title} kapandı: ${formatTRY(credit)} iade`,
        body: `Havuz büyüdüğü için nihai fiyat düştü; fark kredi bakiyenize eklendi. Bir sonraki siparişte kullanabilirsiniz.`,
        link: '/uye/hesap',
        dedupeKey: `wave.rebate:${id}:${memberId}`,
        email: true,
      });
    }
    await audit(tx, actor, 'wave.close', 'wave', id, `${w.title} kapatıldı; ${formatTRY(result.totalCredit)} kademe iadesi`, { cancelledUnpaid: unpaid.length });

    return { totalCredit: result.totalCredit, members: Object.keys(result.creditsByMember).length, offers: result.offers.length };
  });
}
