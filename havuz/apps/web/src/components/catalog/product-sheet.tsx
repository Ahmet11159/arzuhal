'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, ShieldCheck, Star, Users } from 'lucide-react';
import { formatPercent, formatTRY, nextTier, normalizeTiers, resolveTier, savingRatio, type ProductDTO } from '@havuz/core';
import { useCart, type CartMode } from '@/stores/cart';
import { Sheet } from '../ui/sheet';
import { CategoryIcon } from '../ui/icon';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { QtyStepper } from '../app/qty-stepper';
import { bestOffer, offerUnitPrice } from './pricing';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';

export function ProductSheet({ product, mode, onClose }: { product: ProductDTO | null; mode: CartMode; onClose: () => void }) {
  const [offerId, setOfferId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const setLine = useCart((s) => s.setQty);
  const lines = useCart((s) => s.lines);

  useEffect(() => {
    if (!product) return;
    const best = bestOffer(product, mode);
    setOfferId(best?.id ?? null);
    setQty(best ? lines[best.id] ?? 1 : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const offer = product?.offers.find((o) => o.id === offerId) ?? null;
  const unit = offer ? offerUnitPrice(offer, mode, qty) : 0;
  const pooled = mode === 'wave' && offer?.wave ? offer.wave.pooledQty + qty : qty;
  const tiers = offer ? normalizeTiers(offer) : [];
  const cur = offer ? resolveTier(offer, pooled) : null;
  const nxt = offer ? nextTier(offer, pooled) : null;

  return (
    <Sheet
      open={!!product}
      onClose={onClose}
      title={product ? <span className="flex items-center gap-3"><CategoryIcon name={product.category.icon} size="sm" />{product.name}</span> : ''}
      footer={
        offer && (
          <div className="flex items-center gap-3">
            <QtyStepper value={qty} onChange={setQty} min={1} max={offer.stock} unit={product?.unit} />
            <Button
              className="flex-1"
              size="lg"
              onClick={() => {
                setLine(offer.id, qty);
                toast.success(`${product!.name} sepete eklendi`, { description: `${qty} ${product!.unit} · ${offer.supplier.name}` });
                onClose();
              }}
            >
              {formatTRY(unit * qty)} · Sepete ekle
            </Button>
          </div>
        )
      }
    >
      {product && (
        <div className="space-y-6">
          <div>
            <p className="text-sm text-fg-muted">{product.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{product.packLabel}</Badge>
              <Badge>KDV %{product.vatRate}</Badge>
              <Badge>SKU {product.sku}</Badge>
            </div>
          </div>

          <section>
            <h4 className="mb-2.5 text-sm font-semibold">Teklifler</h4>
            <div className="space-y-2">
              {product.offers.map((o) => {
                const p = offerUnitPrice(o, mode);
                const selected = o.id === offerId;
                const disabled = !o.active || o.stock <= 0;
                return (
                  <button
                    key={o.id}
                    disabled={disabled}
                    onClick={() => {
                      setOfferId(o.id);
                      setQty(lines[o.id] ?? qty);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition disabled:opacity-50',
                      selected ? 'border-primary bg-primary-soft/60 shadow-glow' : 'border-border hover:border-fg-subtle/40',
                    )}
                  >
                    <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', selected ? 'border-primary' : 'border-border')}>
                      {selected && <motion.span layoutId="offer-dot" className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{o.supplier.name}</span>
                        {o.sponsored && <Badge className="text-[10px]">Sponsorlu</Badge>}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-fg-muted">
                        <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-current text-accent" />{o.supplier.rating.toFixed(1)}</span>
                        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{formatPercent(o.supplier.onTimeRate)} zamanında</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{o.leadTimeDays} gün</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular">{formatTRY(p)}</div>
                      <div className="text-[11px] text-success">−{formatPercent(savingRatio(product.marketPrice, p))}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {offer && (
            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Fiyat kademeleri</h4>
                {mode === 'wave' && offer.wave && (
                  <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                    <Users className="h-3.5 w-3.5" /> Havuz {offer.wave.pooledQty} + sizin {qty} = <b className="text-fg">{pooled}</b> {product.unit}
                  </span>
                )}
              </div>
              <ol className="space-y-1.5">
                {tiers.map((t, i) => {
                  const active = cur?.tierIndex === i;
                  const reached = (cur?.tierIndex ?? 0) >= i;
                  return (
                    <li key={t.minQty} className={cn('flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm', active ? 'bg-primary text-primary-fg' : reached ? 'bg-muted' : 'border border-dashed border-border')}>
                      <span>{i === 0 ? 'Taban fiyat' : `${t.minQty}+ ${product.unit}`}</span>
                      <span className="font-semibold tabular">{formatTRY(t.unitPrice)}</span>
                    </li>
                  );
                })}
              </ol>
              {nxt && (
                <p className="mt-3 text-xs text-fg-muted">
                  {mode === 'wave' ? 'Havuzda' : 'Bu siparişte'} <b className="text-fg">{nxt.remainingQty} {product.unit}</b> daha olursa birim fiyat <b className="text-primary">{formatTRY(nxt.unitPrice)}</b>’ye düşer.
                  {mode === 'wave' && ' Dalga kapanınca fark otomatik iade edilir.'}
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </Sheet>
  );
}
