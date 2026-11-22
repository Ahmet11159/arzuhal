'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export function QtyStepper({ value, onChange, min = 0, max = 10_000, size = 'md', unit }: { value: number; onChange: (v: number) => void; min?: number; max?: number; size?: 'sm' | 'md'; unit?: string }) {
  const btn = cn('grid place-items-center rounded-lg text-fg-muted transition hover:bg-muted hover:text-fg active:scale-90 disabled:opacity-40', size === 'sm' ? 'h-7 w-7' : 'h-9 w-9');
  return (
    <div className={cn('inline-flex items-center rounded-xl border border-border bg-surface p-0.5', size === 'sm' ? 'gap-0.5' : 'gap-1')}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Azalt">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <label className="flex items-baseline gap-1">
        <span className="sr-only">Miktar</span>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = Math.floor(Number(e.target.value));
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          className={cn('bg-transparent text-center font-semibold tabular outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none', size === 'sm' ? 'w-8 text-[13px]' : 'w-10 text-sm')}
        />
        {unit && size === 'md' && <span className="pr-1 text-xs text-fg-subtle">{unit}</span>}
      </label>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Artır">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
