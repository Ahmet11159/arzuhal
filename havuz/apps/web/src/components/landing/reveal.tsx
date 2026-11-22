'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({ eyebrow, title, description, center }: { eyebrow: string; title: ReactNode; description?: ReactNode; center?: boolean }) {
  return (
    <Reveal className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</div>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.025em] sm:text-[42px] sm:leading-[1.1]">{title}</h2>
      {description && <p className="mt-4 text-[16px] leading-relaxed text-fg-muted">{description}</p>}
    </Reveal>
  );
}
