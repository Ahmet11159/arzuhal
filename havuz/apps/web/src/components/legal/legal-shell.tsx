import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { LEGAL_LINKS, SiteFooter } from '@/components/site/site-footer';
import { cn } from '@/lib/cn';

/** Yasal sayfaların ortak düzeni: başlık, belge listesi, okunaklı metin alanı. */
export function LegalShell({ title, updated, path, children }: { title: string; updated: string; path: string; children: ReactNode }) {
  return (
    <>
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
            <ArrowLeft className="h-4 w-4" /> Ana sayfa
          </Link>
        </div>
      </header>
      <main className="container grid gap-10 py-10 lg:grid-cols-[220px_1fr] lg:py-14">
        <nav aria-label="Belgeler" className="hidden lg:block">
          <ul className="sticky top-6 space-y-1 text-sm">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn('block rounded-lg px-3 py-2 text-fg-muted hover:bg-muted hover:text-fg', l.href === path && 'bg-primary-soft font-medium text-primary')}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="min-w-0 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-fg-subtle">Son güncelleme: {updated}</p>
          <div
            className={cn(
              'mt-8 text-[15px] leading-relaxed text-fg-muted',
              '[&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg',
              '[&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-fg',
              '[&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5',
              '[&_strong]:font-semibold [&_strong]:text-fg [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
              '[&_table]:mt-4 [&_table]:w-full [&_td]:border-b [&_td]:border-border [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-medium [&_th]:text-fg',
            )}
          >
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
