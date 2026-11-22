'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { applyTheme, currentTheme, type Theme } from '@/lib/theme';
import { cn } from '@/lib/cn';

const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const LABEL: Record<Theme, string> = { system: 'Sistem teması', light: 'Açık tema', dark: 'Koyu tema' };

export function ThemeToggle({ className }: { className?: string }) {
  const [t, setT] = useState<Theme>('system');
  useEffect(() => setT(currentTheme()), []);
  const Icon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
  return (
    <button
      onClick={() => {
        const n = NEXT[t];
        applyTheme(n);
        setT(n);
      }}
      className={cn('grid h-9 w-9 place-items-center rounded-xl text-fg-muted transition hover:bg-muted hover:text-fg', className)}
      aria-label={`${LABEL[t]} (değiştir)`}
      title={LABEL[t]}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
