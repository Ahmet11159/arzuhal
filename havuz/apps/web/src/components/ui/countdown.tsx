'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { timeLeft } from '@havuz/core';
import { cn } from '@/lib/cn';

function Digit({ value, label, compact, inverted }: { value: number; label: string; compact?: boolean; inverted?: boolean }) {
  const v = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <div className={cn('relative overflow-hidden rounded-xl font-semibold tabular', inverted ? 'bg-white/10 text-white' : 'bg-fg/[0.06]', compact ? 'h-9 w-10 text-lg' : 'h-14 w-14 text-2xl sm:h-16 sm:w-16 sm:text-3xl')}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={v}
            className="absolute inset-0 grid place-items-center"
            initial={{ y: '-60%', opacity: 0, rotateX: 60 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            exit={{ y: '60%', opacity: 0, rotateX: -60 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {v}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className={cn('mt-1 uppercase tracking-wider', inverted ? 'text-white/45' : 'text-fg-subtle', compact ? 'text-[9px]' : 'text-[10px]')}>{label}</span>
    </div>
  );
}

export function Countdown({ to, compact, className, inverted }: { to: string; compact?: boolean; className?: string; inverted?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const t = timeLeft(to, now ?? new Date(to));
  if (now && t.expired) return <span className="text-sm font-medium text-warning">Sipariş alımı kapandı</span>;
  return (
    <div className={cn('flex items-start gap-1.5 sm:gap-2', className)} aria-label="Dalga kapanışına kalan süre">
      <Digit value={t.days} label="gün" compact={compact} inverted={inverted} />
      <Digit value={t.hours} label="saat" compact={compact} inverted={inverted} />
      <Digit value={t.minutes} label="dk" compact={compact} inverted={inverted} />
      {!compact && <Digit value={t.seconds} label="sn" inverted={inverted} />}
    </div>
  );
}
