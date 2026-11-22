import type { Kurus } from '../money';

/**
 * Kademeli fiyat: belirli bir toplam miktara ulaşıldığında birim fiyat düşer.
 * `minQty` dahil eşik; taban fiyat (basePrice) her zaman minQty=1 kademesidir.
 */
export interface PriceTier {
  minQty: number;
  unitPrice: Kurus;
}

export interface TieredOffer {
  basePrice: Kurus;
  tiers: PriceTier[];
}

/** Taban fiyatı da içeren, eşiğe göre artan sırada ve tutarlı kademe listesi. */
export function normalizeTiers(offer: TieredOffer): PriceTier[] {
  const all = [{ minQty: 1, unitPrice: offer.basePrice }, ...offer.tiers]
    .filter((t) => t.minQty >= 1 && t.unitPrice > 0)
    .sort((a, b) => a.minQty - b.minQty);
  // Aynı eşikte birden fazla kademe varsa en ucuzunu tut; daha yüksek eşikte daha pahalı kademe olamaz.
  const result: PriceTier[] = [];
  for (const t of all) {
    const last = result[result.length - 1];
    if (last && last.minQty === t.minQty) {
      last.unitPrice = Math.min(last.unitPrice, t.unitPrice);
    } else if (!last || t.unitPrice < last.unitPrice) {
      result.push({ ...t });
    }
  }
  return result;
}

export interface ResolvedTier {
  unitPrice: Kurus;
  tierIndex: number;
  tier: PriceTier;
}

/** Verilen (havuzlanmış) toplam miktar için geçerli kademe. */
export function resolveTier(offer: TieredOffer, qty: number): ResolvedTier {
  const tiers = normalizeTiers(offer);
  let idx = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (qty >= tiers[i].minQty) idx = i;
  }
  return { unitPrice: tiers[idx].unitPrice, tierIndex: idx, tier: tiers[idx] };
}

export interface NextTierInfo {
  minQty: number;
  unitPrice: Kurus;
  remainingQty: number;
  /** Önceki eşikten sonrakine ilerleme oranı (0–1). */
  progress: number;
  /** Mevcut fiyata göre birim başına ek indirim. */
  unitSaving: Kurus;
}

/** Bir sonraki kademeye ne kadar kaldığı — dalga ilerleme çubuklarını besler. */
export function nextTier(offer: TieredOffer, pooledQty: number): NextTierInfo | null {
  const tiers = normalizeTiers(offer);
  const current = resolveTier(offer, pooledQty);
  const next = tiers[current.tierIndex + 1];
  if (!next) return null;
  const from = current.tierIndex === 0 ? 0 : current.tier.minQty;
  const span = next.minQty - from;
  const progress = span <= 0 ? 1 : Math.min(1, Math.max(0, (pooledQty - from) / span));
  return {
    minQty: next.minQty,
    unitPrice: next.unitPrice,
    remainingQty: Math.max(0, next.minQty - pooledQty),
    progress,
    unitSaving: current.unitPrice - next.unitPrice,
  };
}

/** En derin kademe (dalganın ulaşabileceği en iyi fiyat). */
export function bestPossiblePrice(offer: TieredOffer): Kurus {
  const tiers = normalizeTiers(offer);
  return tiers[tiers.length - 1].unitPrice;
}

/** Piyasa fiyatına göre tasarruf oranı (0–1). */
export function savingRatio(marketPrice: Kurus, unitPrice: Kurus): number {
  if (marketPrice <= 0) return 0;
  return Math.max(0, (marketPrice - unitPrice) / marketPrice);
}

export interface OfferLike extends TieredOffer {
  id: string;
  stock: number;
  active: boolean;
  leadTimeDays: number;
}

/** Aktif ve stokta olan teklifler arasından mevcut birim fiyatı en düşük olanı seçer. */
export function pickBestOffer<T extends OfferLike>(offers: T[], pooledQtyByOffer: Record<string, number> = {}): T | null {
  const candidates = offers.filter((o) => o.active && o.stock > 0);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, o) => {
    const p = resolveTier(o, pooledQtyByOffer[o.id] ?? 0).unitPrice;
    const bp = resolveTier(best, pooledQtyByOffer[best.id] ?? 0).unitPrice;
    if (p < bp) return o;
    if (p === bp && o.leadTimeDays < best.leadTimeDays) return o;
    return best;
  });
}
