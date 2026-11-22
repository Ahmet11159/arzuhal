'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, ShoppingCart, type LucideIcon } from 'lucide-react';
import { PLAN_LABEL } from '@havuz/core';
import { useLogout, useMe } from '@havuz/sdk';
import { cn } from '@/lib/cn';
import { useCartCount } from '@/stores/cart';
import { Logo } from '../ui/logo';
import { Badge } from '../ui/badge';
import { ThemeToggle } from './theme-toggle';
import { NotificationBell } from './notification-bell';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Mobil alt sekme çubuğunda gösterilsin mi (en fazla 5). */
  mobile?: boolean;
  exact?: boolean;
}

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function CartButton() {
  const count = useCartCount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <Link href="/uye/sepet" className="relative grid h-9 w-9 place-items-center rounded-xl text-fg-muted transition hover:bg-muted hover:text-fg" aria-label={`Sepet (${mounted ? count : 0} ürün)`}>
      <ShoppingCart className="h-[18px] w-[18px]" />
      <AnimatePresence>
        {mounted && count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10.5px] font-semibold text-primary-fg ring-2 ring-surface"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

function SidebarCart({ active }: { active: boolean }) {
  const count = useCartCount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <Link
      href="/uye/sepet"
      className={cn('relative mt-3 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition', active ? 'border-primary/40 bg-primary-soft text-fg' : 'border-border text-fg-muted hover:bg-muted/60 hover:text-fg')}
    >
      <ShoppingCart className={cn('h-[18px] w-[18px]', active && 'text-primary')} />
      Sepet
      {mounted && count > 0 && (
        <motion.span key={count} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-fg">
          {count}
        </motion.span>
      )}
    </Link>
  );
}

export function AppShell({ nav, children, areaLabel, showCart }: { nav: NavItem[]; children: ReactNode; areaLabel: string; showCart?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useMe();
  const logout = useLogout();
  const user = data?.user;
  const mobileNav = nav.filter((n) => n.mobile).slice(0, 5);

  const doLogout = async () => {
    await logout.mutateAsync().catch(() => undefined);
    router.replace('/giris');
  };

  return (
    <div className="min-h-dvh">
      {/* Masaüstü kenar çubuğu */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface/60 px-3 py-4 backdrop-blur-xl lg:flex">
        <div className="flex items-start justify-between px-2">
          <div>
            <Logo href={nav[0]?.href ?? '/'} />
            <div className="mt-1.5 pl-[42px] text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{areaLabel}</div>
          </div>
          <NotificationBell align="left" />
        </div>
        <nav className="mt-7 flex-1 space-y-0.5" aria-label="Ana menü">
          {nav.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', active ? 'text-fg' : 'text-fg-muted hover:bg-muted/60 hover:text-fg')}
              >
                {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-muted shadow-[inset_0_0_0_1px_rgb(var(--border))]" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                <item.icon className={cn('relative h-[18px] w-[18px]', active && 'text-primary')} />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
          {showCart && <SidebarCart active={pathname === '/uye/sepet'} />}
        </nav>
        <div className="rounded-2xl border border-border bg-surface p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-sm font-semibold text-primary-fg">
              {user?.org.name.slice(0, 1) ?? '·'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{user?.org.name ?? '…'}</div>
              <div className="truncate text-[11.5px] text-fg-muted">{user?.email}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            {user?.role === 'member' ? <Badge tone={user.org.plan === 'pro' ? 'accent' : 'neutral'}>{PLAN_LABEL[user.org.plan]} üye</Badge> : <span />}
            <div className="flex items-center">
              <ThemeToggle />
              <button onClick={doLogout} className="grid h-9 w-9 place-items-center rounded-xl text-fg-muted hover:bg-muted hover:text-danger" aria-label="Çıkış yap" title="Çıkış yap">
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobil üst çubuk */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
        <Logo href={nav[0]?.href ?? '/'} />
        <div className="flex items-center gap-1">
          <NotificationBell />
          {showCart && <CartButton />}
          <ThemeToggle />
          <button onClick={doLogout} className="grid h-9 w-9 place-items-center rounded-xl text-fg-muted hover:bg-muted" aria-label="Çıkış yap">
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
      </div>

      {/* Mobil alt sekme çubuğu — native uygulama hissi */}
      <nav className="glass fixed inset-x-0 bottom-0 z-30 border-t border-border pb-safe pt-1.5 lg:hidden" aria-label="Alt menü">
        <div className="mx-auto flex max-w-md justify-around">
          {mobileNav.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link key={item.href} href={item.href} className="relative flex w-16 flex-col items-center gap-1 rounded-xl py-1.5 text-[10.5px] font-medium">
                {active && <motion.span layoutId="tab-active" className="absolute inset-x-2 -top-1.5 h-0.5 rounded-full bg-primary" />}
                <item.icon className={cn('h-5 w-5 transition-colors', active ? 'text-primary' : 'text-fg-subtle')} />
                <span className={active ? 'text-fg' : 'text-fg-subtle'}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
