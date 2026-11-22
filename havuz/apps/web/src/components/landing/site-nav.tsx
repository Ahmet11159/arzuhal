'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from '../ui/logo';

const LINKS = [
  { href: '#nasil', label: 'Nasıl çalışır' },
  { href: '#tasarruf', label: 'Tasarruf' },
  { href: '#tedarikci', label: 'Tedarikçiler' },
  { href: '#fiyat', label: 'Üyelik' },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => {
      setScrolled(window.scrollY > 24);
      setPastHero(window.scrollY > window.innerHeight - 80);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        pastHero ? 'glass border-b border-border' : scrolled ? 'border-b border-white/10 bg-[#050d0a]/75 backdrop-blur-xl' : 'bg-transparent',
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <Logo light={!pastHero} />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Site menüsü">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={cn('rounded-lg px-3 py-2 text-sm transition', pastHero ? 'text-fg-muted hover:text-fg' : 'text-white/65 hover:text-white')}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/giris" className={cn('rounded-lg px-3 py-2 text-sm font-medium transition', pastHero ? 'text-fg-muted hover:text-fg' : 'text-white/80 hover:text-white')}>
            Giriş yap
          </Link>
          <a href="#basvuru" className={cn('rounded-xl px-4 py-2 text-sm font-semibold transition', pastHero ? 'bg-primary text-primary-fg hover:brightness-110' : 'bg-white text-[#050d0a] hover:bg-white/90')}>
            Ağa katıl
          </a>
        </div>
        <button className={cn('grid h-10 w-10 place-items-center rounded-xl md:hidden', pastHero ? 'text-fg' : 'text-white')} onClick={() => setOpen((o) => !o)} aria-label="Menü" aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-white/10 bg-[#050d0a]/95 backdrop-blur-xl md:hidden">
            <div className="container flex flex-col gap-1 py-4">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-white/80">
                  {l.label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link href="/giris" className="rounded-xl border border-white/15 py-3 text-center text-sm font-medium text-white">
                  Giriş yap
                </Link>
                <a href="#basvuru" onClick={() => setOpen(false)} className="rounded-xl bg-white py-3 text-center text-sm font-semibold text-[#050d0a]">
                  Ağa katıl
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
