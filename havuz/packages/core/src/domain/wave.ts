import type { Kurus } from '../money';
import { resolveTier, type TieredOffer } from './pricing';

/**
 * Toplu sipariş dalgası (wave) kapanışı.
 *
 * Üyeler sipariş anında o anki havuz kademesinden öder. Dalga kapandığında
 * toplam hacme göre nihai kademe belirlenir; ödenen ile nihai fiyat
 * arasındaki fark üyenin hesabına **kredi** olarak geçer.
 */
export interface WaveLine {
  lineId: string;
  orderId: string;
  memberId: string;
  offerId: string;
  qty: number;
  paidUnitPrice: Kurus;
}

export interface WaveLineResult extends WaveLine {
  finalUnitPrice: Kurus;
  credit: Kurus;
}

export interface WaveOfferResult {
  offerId: string;
  pooledQty: number;
  finalUnitPrice: Kurus;
  tierIndex: number;
}

export interface WaveCloseResult {
  lines: WaveLineResult[];
  offers: WaveOfferResult[];
  creditsByMember: Record<string, Kurus>;
  creditsByOrder: Record<string, Kurus>;
  totalCredit: Kurus;
  totalVolume: Kurus;
}

export function pooledQuantities(lines: Pick<WaveLine, 'offerId' | 'qty'>[]): Record<string, number> {
  const pooled: Record<string, number> = {};
  for (const l of lines) pooled[l.offerId] = (pooled[l.offerId] ?? 0) + l.qty;
  return pooled;
}

export function closeWave(lines: WaveLine[], offers: Record<string, TieredOffer>): WaveCloseResult {
  const pooled = pooledQuantities(lines);
  const offerResults: WaveOfferResult[] = Object.entries(pooled).map(([offerId, pooledQty]) => {
    const offer = offers[offerId];
    if (!offer) throw new Error(`Dalga kapanışı: teklif bulunamadı (${offerId})`);
    const r = resolveTier(offer, pooledQty);
    return { offerId, pooledQty, finalUnitPrice: r.unitPrice, tierIndex: r.tierIndex };
  });
  const finalByOffer = Object.fromEntries(offerResults.map((o) => [o.offerId, o.finalUnitPrice]));

  const creditsByMember: Record<string, Kurus> = {};
  const creditsByOrder: Record<string, Kurus> = {};
  let totalCredit = 0;
  let totalVolume = 0;

  const lineResults = lines.map((l) => {
    // Nihai fiyat hiçbir zaman ödenen fiyattan yüksek olamaz (üye korunur).
    const finalUnitPrice = Math.min(l.paidUnitPrice, finalByOffer[l.offerId]);
    const credit = (l.paidUnitPrice - finalUnitPrice) * l.qty;
    totalCredit += credit;
    totalVolume += finalUnitPrice * l.qty;
    if (credit > 0) {
      creditsByMember[l.memberId] = (creditsByMember[l.memberId] ?? 0) + credit;
      creditsByOrder[l.orderId] = (creditsByOrder[l.orderId] ?? 0) + credit;
    }
    return { ...l, finalUnitPrice, credit };
  });

  return { lines: lineResults, offers: offerResults, creditsByMember, creditsByOrder, totalCredit, totalVolume };
}

/** Dalga kapanışına kalan süre — geri sayım bileşenleri için. */
export function timeLeft(cutoffAt: Date | string, now: Date = new Date()) {
  const ms = Math.max(0, new Date(cutoffAt).getTime() - now.getTime());
  const s = Math.floor(ms / 1000);
  return {
    totalMs: ms,
    days: Math.floor(s / 86_400),
    hours: Math.floor((s % 86_400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    expired: ms === 0,
  };
}
