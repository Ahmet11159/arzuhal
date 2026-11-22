'use client';

import { motion } from 'framer-motion';
import { Check, Plus, Sparkles, Store, Users } from 'lucide-react';
import { formatPercent, formatTRY, savingRatio, type ProductDTO } from '@havuz/core';
import { useCart, type CartMode } from '@/stores/cart';
import { CategoryIcon } from '../ui/icon';
import { TiltCard } from '../ui/tilt';
import { Progress } from '../ui/progress';
import { QtyStepper } from '../app/qty-stepper';
import { bestOffer, offerUnitPrice } from './pricing';
import { cn } from '@/lib/cn';

export function ProductCard({ p, mode, onOpen, index }: { p: ProductDTO; mode: CartMode; onOpen: () => void; index: number }) {
  const offer = bestOffer(p, mode);
  const qty = useCart((s) => (offer ? s.lines[offer.id] ?? 0 : 0));
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const price = offer ? offerUnitPrice(offer, mode) : 0;
  const ratio = savingRatio(p.marketPrice, price);
  const wave = mode === 'wave' ? offer?.wave : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, delay: Math.min(index, 12) * 0.03, ease: [0.16, 1, 0.3, 1] }}
    >
      <TiltCard intensity={5} className="h-full rounded-2xl">
        <div className={cn('flex h-full flex-col rounded-2xl border bg-surface p-4 shadow-card transition-shadow hover:shadow-lift', qty > 0 ? 'border-primary/50' : 'border-border')}>
          <button onClick={onOpen} className="flex items-start gap-3 text-left" aria-label={`${p.name} ayrıntıları`}>
            <CategoryIcon name={p.category.icon} size="lg" className="[transform:translateZ(24px)]" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold leading-snug">{p.name}</h3>
              <p className="mt-0.5 text-xs text-fg-muted">{p.packLabel}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-fg-subtle">
                <span className="inline-flex items-center gap-1">
                  <Store className="h-3 w-3" />
                  {p.offers.length} teklif
                </span>
                {offer?.sponsored && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-px text-[10px] font-medium text-fg-muted">
                    <Sparkles className="h-2.5 w-2.5" />
                    Sponsorlu
                  </span>
                )}
              </div>
            </div>
          </button>

          <div className="mt-4 flex items-end justify-between gap-2">
            <div>
              <div className="text-xl font-semibold tracking-tight tabular">{offer ? formatTRY(price) : '—'}</div>
              <div className="text-xs text-fg-subtle">
                / {p.unit} · <span className="line-through">{formatTRY(p.marketPrice)}</span>
              </div>
            </div>
            {ratio > 0.005 && <span className="rounded-lg bg-success-soft px-2 py-1 text-xs font-semibold text-success">−{formatPercent(ratio)}</span>}
          </div>

          {wave?.next ? (
            <div className="mt-3 rounded-xl bg-muted/60 p-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1 text-fg-muted">
                  <Users className="h-3 w-3" /> Havuz: <b className="text-fg">{wave.pooledQty}</b> {p.unit}
                </span>
                <span className="font-medium text-primary">{wave.next.remainingQty} kaldı → {formatTRY(wave.next.unitPrice)}</span>
              </div>
              <Progress value={wave.next.progress} label="Sonraki kademeye ilerleme" className="h-1.5" />
            </div>
          ) : wave ? (
            <div className="mt-3 rounded-xl bg-primary-soft px-2.5 py-2 text-[11px] font-medium text-primary">En iyi kademe açıldı · havuz {wave.pooledQty} {p.unit}</div>
          ) : (
            <div className="mt-3 text-[11px] text-fg-subtle">Teslimat {offer?.leadTimeDays ?? '-'} gün içinde</div>
          )}

          <div className="mt-auto pt-4">
            {!offer ? (
              <div className="h-9 text-center text-sm text-fg-subtle">Stokta yok</div>
            ) : qty > 0 ? (
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <Check className="h-3.5 w-3.5" /> Sepette
                </span>
                <QtyStepper value={qty} onChange={(v) => setQty(offer.id, v)} size="sm" max={offer.stock} />
              </div>
            ) : (
              <button
                onClick={() => add(offer.id, 1)}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-fg text-sm font-medium text-bg transition hover:opacity-90 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Sepete ekle
              </button>
            )}
          </div>
        </div>
      </TiltCard>
    </motion.div>
  );
}
