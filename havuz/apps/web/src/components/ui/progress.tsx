'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export function Progress({ value, className, tone = 'primary', label }: { value: number; className?: string; tone?: 'primary' | 'accent'; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-label={label}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <motion.div
        className={cn(
          'absolute inset-y-0 left-0 rounded-full',
          tone === 'primary' ? 'bg-gradient-to-r from-primary/70 to-primary' : 'bg-gradient-to-r from-accent/70 to-accent',
        )}
        initial={{ width: 0 }}
        whileInView={{ width: `${v * 100}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/35 to-transparent" />
      </motion.div>
    </div>
  );
}
