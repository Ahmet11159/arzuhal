'use client';

import { useEffect, useRef } from 'react';
import { animate, useInView, useMotionValue } from 'framer-motion';

/** Görünür olduğunda 0'dan hedefe yumuşakça sayar. Biçimlendirici dışarıdan verilir. */
export function AnimatedNumber({ value, format, duration = 1.1, className }: { value: number; format: (n: number) => string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const mv = useMotionValue(0);
  const fmt = useRef(format);
  fmt.current = format;

  useEffect(() => {
    if (!ref.current) return;
    ref.current.textContent = fmt.current(Math.round(mv.get()));
    const unsub = mv.on('change', (v) => {
      if (ref.current) ref.current.textContent = fmt.current(Math.round(v));
    });
    return unsub;
  }, [mv]);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, value, duration, mv]);

  return (
    <span ref={ref} className={className} aria-label={format(value)}>
      {format(0)}
    </span>
  );
}
