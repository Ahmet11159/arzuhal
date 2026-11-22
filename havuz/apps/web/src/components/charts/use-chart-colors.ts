'use client';

import { useEffect, useState } from 'react';

const KEYS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-6', 'chart-7', 'chart-brand', 'chart-grid'] as const;
type Colors = Record<(typeof KEYS)[number], string> & { fgMuted: string; surface: string };

function read(): Colors {
  const cs = getComputedStyle(document.documentElement);
  const out = Object.fromEntries(KEYS.map((k) => [k, cs.getPropertyValue(`--${k}`).trim()])) as Colors;
  out.fgMuted = `rgb(${cs.getPropertyValue('--fg-muted').trim()})`;
  out.surface = `rgb(${cs.getPropertyValue('--surface').trim()})`;
  return out;
}

/** Tema değiştiğinde (data-theme veya sistem tercihi) grafik renklerini yeniden okur. */
export function useChartColors(): Colors | null {
  const [c, setC] = useState<Colors | null>(null);
  useEffect(() => {
    const update = () => setC(read());
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    return () => {
      mo.disconnect();
      mq.removeEventListener('change', update);
    };
  }, []);
  return c;
}
