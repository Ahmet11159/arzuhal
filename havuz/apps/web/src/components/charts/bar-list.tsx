'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { formatPercent } from '@havuz/core';

/** Yatay çubuk listesi — kategori payları gibi büyüklük karşılaştırmaları için (pasta grafiği yerine). */
export function BarList({ items, format }: { items: { label: string; value: number; icon?: ReactNode }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={it.label} className="group" title={`${it.label}: ${format(it.value)}`}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
            <span className="inline-flex min-w-0 items-center gap-2">
              {it.icon}
              <span className="truncate font-medium">{it.label}</span>
            </span>
            <span className="shrink-0 tabular text-fg-muted">
              {format(it.value)} <span className="text-fg-subtle">· {formatPercent(it.value / total)}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-[var(--chart-brand)] group-hover:brightness-110"
              initial={{ width: 0 }}
              whileInView={{ width: `${(it.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
