'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { estimateSavings, formatPercent, formatTRYWhole, toKurus } from '@havuz/core';
import { AnimatedNumber } from '../ui/animated-number';

/** Tasarruf hesaplayıcısı. Oranlar @havuz/core'daki varsayımlardan gelir ve sayfada açıkça belirtilir. */
export function SavingsCalculator() {
  const [spend, setSpend] = useState(250_000);
  const [share, setShare] = useState(40);
  const est = estimateSavings(toKurus(spend), share / 100);
  const max = Math.max(...est.byCategory.map((c) => c.saving), 1);

  return (
    <div className="grid overflow-hidden rounded-3xl border border-border bg-surface shadow-card lg:grid-cols-2">
      <div className="space-y-8 p-6 sm:p-8">
        <label className="block">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-medium">Aylık toplam tedarik harcaması</span>
            <span className="text-lg font-semibold tabular">{formatTRYWhole(toKurus(spend))}</span>
          </div>
          <input type="range" min={30_000} max={1_500_000} step={10_000} value={spend} onChange={(e) => setSpend(Number(e.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[rgb(var(--primary))]" aria-label="Aylık harcama" />
        </label>
        <label className="block">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-medium">Havuz üzerinden alınan pay</span>
            <span className="text-lg font-semibold tabular">%{share}</span>
          </div>
          <input type="range" min={10} max={100} step={5} value={share} onChange={(e) => setShare(Number(e.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[rgb(var(--primary))]" aria-label="Havuz payı" />
        </label>
        <ul className="space-y-2.5">
          {est.byCategory.map((c, i) => (
            <li key={c.key} className="grid grid-cols-[140px_1fr_auto] items-center gap-3 text-[13px]">
              <span className="truncate text-fg-muted">{c.label}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${(c.saving / max) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20, delay: i * 0.02 }} />
              </div>
              <span className="w-20 text-right tabular">{formatTRYWhole(c.saving)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative flex flex-col justify-between overflow-hidden bg-[#06120e] p-6 text-white sm:p-8">
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#2cc79a]/25 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#f5b453]/15 blur-3xl" />
        <div className="relative">
          <div className="text-sm text-white/55">Tahmini aylık tasarruf</div>
          <div className="mt-2 text-5xl font-semibold tracking-tight tabular sm:text-6xl">
            <AnimatedNumber key={est.monthly} value={est.monthly} format={formatTRYWhole} duration={0.6} />
          </div>
          <div className="mt-2 text-white/60">
            Yıllık <b className="text-[#5ef0c4]">{formatTRYWhole(est.yearly)}</b> · havuzdan alınan tutarın {formatPercent(est.rate)}’i
          </div>
        </div>
        <p className="relative mt-10 text-xs leading-relaxed text-white/40">
          Kategori bazlı ortalama oranlar varsayımdır; gerçek tasarruf ürün karmasına, dalga katılımına ve bölgeye göre değişir. Üye panelinde gerçekleşen
          tasarrufunuz her siparişte piyasa referans fiyatıyla karşılaştırılarak gösterilir.
        </p>
      </div>
    </div>
  );
}
