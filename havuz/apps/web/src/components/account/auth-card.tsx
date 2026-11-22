import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/app/theme-toggle';

/** Giriş dışı kimlik sayfaları için sade, ortalanmış kart düzeni. */
export function AuthCard({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-6 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-sm text-fg-muted">{description}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
