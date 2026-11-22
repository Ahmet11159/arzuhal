'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Store } from 'lucide-react';
import { formatTRY, normalizeTiers, resolveTier, nextTier, toKurus } from '@havuz/core';
import { cn } from '@/lib/cn';
import { AnimatedNumber } from '../ui/animated-number';

/** "Hacim biriktikçe fiyat düşer" fikrini etkileşimli gösteren demo (gerçek kademe motoru ile). */
const OFFER = {
  basePrice: toKurus(2000),
  tiers: [
    { minQty: 20, unitPrice: toKurus(1900) },
    { minQty: 50, unitPrice: toKurus(1800) },
    { minQty: 100, unitPrice: toKurus(1720) },
  ],
};

export function TierDemo() {
  const [qty, setQty] = useState(34);
  const tiers = useMemo(() => normalizeTiers(OFFER), []);
  const current = resolveTier(OFFER, qty);
  const next = nextTier(OFFER, qty);
  const cafes = Math.max(1, Math.round(qty / 2.2));

  return (
    <div className="grid gap-8 rounded-3xl border border-border bg-surface p-5 shadow-card sm:p-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <div className="text-[13px] font-medium text-fg-muted">Ayçiçek yağı · 18 L teneke</div>
        <div className="mt-3 flex items-end gap-3">
          <div className="text-5xl font-semibold tracking-tight tabular">
            <AnimatedNumber key={current.unitPrice} value={current.unitPrice} format={formatTRY} duration={0.5} />
          </div>
          <div className="pb-1.5 text-sm text-fg-muted">/ teneke</div>
        </div>
        <div className="mt-2 text-sm">
          {current.unitPrice < OFFER.basePrice ? (
            <span className="font-medium text-success">Tek başına alıma göre {formatTRY(OFFER.basePrice - current.unitPrice)} daha ucuz</span>
          ) : (
            <span className="text-fg-muted">Henüz taban fiyattasınız</span>
          )}
        </div>

        <label className="mt-8 block">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium">Havuzdaki toplam sipariş</span>
            <span className="tabular text-fg-muted">
              <b className="text-fg">{qty}</b> teneke · ~{cafes} işletme
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={130}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[rgb(var(--primary))]"
            aria-label="Havuzdaki toplam sipariş miktarı"
          />
        </label>

        <div className="mt-6 flex flex-wrap gap-1.5" aria-hidden>
          {Array.from({ length: Math.min(cafes, 48) }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, delay: i * 0.005 }}
              className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft text-primary"
            >
              <Store className="h-3.5 w-3.5" />
            </motion.span>
          ))}
        </div>

        {next && (
          <p className="mt-5 text-sm text-fg-muted">
            <b className="text-fg">{next.remainingQty} teneke</b> daha toplanırsa herkes için fiyat <b className="text-primary">{formatTRY(next.unitPrice)}</b> olur.
          </p>
        )}
      </div>

      <ol className="relative space-y-2.5">
        {tiers.map((t, i) => {
          const reached = i <= current.tierIndex;
          const active = i === current.tierIndex;
          return (
            <motion.li
              key={t.minQty}
              layout
              className={cn(
                'relative flex items-center justify-between rounded-2xl border px-4 py-3.5 transition-colors',
                active ? 'border-primary/50 bg-primary-soft shadow-glow' : reached ? 'border-border bg-muted/50' : 'border-dashed border-border',
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn('grid h-7 w-7 place-items-center rounded-full text-xs font-semibold', reached ? 'bg-primary text-primary-fg' : 'bg-muted text-fg-subtle')}>
                  {reached ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <div>
                  <div className="text-sm font-medium">{i === 0 ? 'Taban fiyat' : `${t.minQty}+ teneke`}</div>
                  <div className="text-xs text-fg-muted">{i === 0 ? 'Tek başına alım' : `Kademe ${i}`}</div>
                </div>
              </div>
              <div className={cn('text-right font-semibold tabular', active && 'text-primary')}>
                {formatTRY(t.unitPrice)}
                {i > 0 && <div className="text-[11px] font-medium text-success">−%{Math.round((1 - t.unitPrice / OFFER.basePrice) * 100)}</div>}
              </div>
            </motion.li>
          );
        })}
        <p className="pt-2 text-xs text-fg-subtle">
          Dalga kapanınca nihai kademe herkese uygulanır. Erken sipariş verip daha yüksek ödeyenlere fark otomatik olarak kredi olarak iade edilir.
        </p>
      </ol>
    </div>
  );
}
