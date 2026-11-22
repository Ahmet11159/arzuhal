/**
 * Tüm para değerleri sistem genelinde **kuruş (tam sayı)** olarak tutulur.
 * Kayan nokta hatalarını önler; yalnızca gösterimde TL'ye çevrilir.
 */
export type Kurus = number;

export const toKurus = (lira: number): Kurus => Math.round(lira * 100);
export const toLira = (kurus: Kurus): number => kurus / 100;

const tryFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const tryCompact = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const tryWhole = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

/** 123456 → "₺1.234,56" */
export const formatTRY = (kurus: Kurus): string => tryFormatter.format(toLira(kurus));
/** 123456789 → "₺1,2 Mn" */
export const formatTRYCompact = (kurus: Kurus): string => tryCompact.format(toLira(kurus));
/** 123456 → "₺1.235" */
export const formatTRYWhole = (kurus: Kurus): string => tryWhole.format(toLira(kurus));

const pct = new Intl.NumberFormat('tr-TR', { style: 'percent', maximumFractionDigits: 1 });
/** 0.123 → "%12,3" */
export const formatPercent = (ratio: number): string => pct.format(ratio);

const num = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });
export const formatNumber = (n: number): string => num.format(n);

/** Basis point (binde/onbinde) oranıyla tutar hesabı. 300 bps = %3 */
export const applyBps = (amount: Kurus, bps: number): Kurus => Math.round((amount * bps) / 10_000);

export const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);
