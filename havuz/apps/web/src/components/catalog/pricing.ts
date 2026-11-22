import { resolveTier, type OfferDTO, type ProductDTO } from '@havuz/core';
import type { CartMode } from '@/stores/cart';

/** Moda göre teklifin şu anki birim fiyatı (dalga: havuz kademesi + kendi miktarı; hemen: kendi miktarı). */
export function offerUnitPrice(offer: OfferDTO, mode: CartMode, qty = 0): number {
  if (mode === 'wave' && offer.wave) return resolveTier(offer, offer.wave.pooledQty + qty).unitPrice;
  return resolveTier(offer, Math.max(1, qty)).unitPrice;
}

export function bestOffer(p: ProductDTO, mode: CartMode): OfferDTO | null {
  const active = p.offers.filter((o) => o.active && o.stock > 0);
  if (!active.length) return null;
  return active.reduce((b, o) => (offerUnitPrice(o, mode) < offerUnitPrice(b, mode) ? o : b));
}
