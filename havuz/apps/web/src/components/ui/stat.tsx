'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { AnimatedNumber } from './animated-number';

export function StatTile({
  label,
  value,
  format,
  icon,
  hint,
  tone = 'neutral',
  index = 0,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  icon: ReactNode;
  hint?: ReactNode;
  tone?: 'neutral' | 'primary' | 'accent';
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4 shadow-card sm:p-5',
        tone === 'primary' ? 'border-primary/25 bg-gradient-to-br from-primary-soft to-surface' : tone === 'accent' ? 'border-accent/30 bg-gradient-to-br from-accent-soft to-surface' : 'border-border bg-surface',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-fg-muted">{label}</span>
        <span className={cn('grid h-8 w-8 place-items-center rounded-lg', tone === 'primary' ? 'bg-primary text-primary-fg' : tone === 'accent' ? 'bg-accent text-accent-fg' : 'bg-muted text-fg-muted')}>
          {icon}
        </span>
      </div>
      <div className="mt-3 text-[26px] font-semibold leading-none tracking-tight tabular">
        <AnimatedNumber value={value} format={format} />
      </div>
      {hint && <div className="mt-2 text-xs text-fg-muted">{hint}</div>}
    </motion.div>
  );
}
