'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Lock, Mail, ShieldCheck, Store, Truck } from 'lucide-react';
import { loginInput, type Role } from '@havuz/core';
import { useLogin } from '@havuz/sdk';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { cn } from '@/lib/cn';

const HOME: Record<Role, string> = { member: '/uye', supplier: '/tedarikci', admin: '/yonetim' };

const DEMOS = [
  { role: 'member' as const, email: 'uye@havuz.app', title: 'İşletme', desc: 'Moda Sahil Kahve', icon: Store },
  { role: 'supplier' as const, email: 'tedarikci@havuz.app', title: 'Tedarikçi', desc: 'Anadolu Gıda Toptan', icon: Truck },
  { role: 'admin' as const, email: 'yonetim@havuz.app', title: 'Yönetim', desc: 'Havuz Operasyon', icon: ShieldCheck },
];

export function LoginView() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e?: React.FormEvent, creds?: { email: string; password: string }) {
    e?.preventDefault();
    const parsed = loginInput.safeParse(creds ?? { email, password });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    try {
      const r = await login.mutateAsync(parsed.data);
      const next = params.get('next');
      const home = HOME[r.user.role];
      if (r.user.mustChangePassword) router.replace('/sifre-degistir');
      else router.replace(next && next.startsWith(home) ? next : home);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız');
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-semibold tracking-tight">Tekrar hoş geldiniz</h1>
            <p className="mt-2 text-sm text-fg-muted">Hesabınıza giriş yapın ya da aşağıdan bir demo rolü seçin.</p>

            <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
              <Field label="E-posta">
                <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="h-4 w-4" />} placeholder="ornek@isletme.com" />
              </Field>
              <Field label="Şifre">
                <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock className="h-4 w-4" />} placeholder="••••••••" />
              </Field>
              <div className="-mt-1 text-right">
                <Link href="/sifremi-unuttum" className="text-[13px] font-medium text-primary hover:underline">
                  Şifremi unuttum
                </Link>
              </div>
              {error && (
                <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }} className="text-sm text-danger" role="alert">
                  {error}
                </motion.p>
              )}
              <Button type="submit" size="lg" className="w-full" loading={login.isPending && !!email}>
                Giriş yap <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-10">
              <div className="mb-3 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-fg-subtle">
                <span className="h-px flex-1 bg-border" />
                Tek tıkla demo
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-2.5">
                {DEMOS.map((d, i) => (
                  <motion.button
                    key={d.role}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.06 }}
                    onClick={() => {
                      setEmail(d.email);
                      setPassword('havuz123');
                      submit(undefined, { email: d.email, password: 'havuz123' });
                    }}
                    disabled={login.isPending}
                    className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift disabled:opacity-60"
                  >
                    <span className={cn('grid h-10 w-10 place-items-center rounded-xl', i === 0 ? 'bg-primary-soft text-primary' : i === 1 ? 'bg-accent-soft text-warning' : 'bg-info-soft text-info')}>
                      <d.icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{d.title}</span>
                      <span className="block text-xs text-fg-muted">{d.desc}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </motion.button>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-fg-subtle">Demo şifresi: havuz123</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-[#050d0a] lg:block">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_40%,rgba(44,199,154,0.25),transparent_70%),radial-gradient(40%_40%_at_80%_90%,rgba(245,180,83,0.15),transparent_70%)]" />
        <div aria-hidden className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <FloatingCards />
          <blockquote className="max-w-md">
            <p className="text-2xl font-medium leading-snug tracking-tight">“Domatesi pahalı mı alıyorum?” sorusunun cevabı artık her siparişte, emsal işletmelerle karşılaştırmalı olarak önünüzde.</p>
            <footer className="mt-4 flex items-center gap-2 text-sm text-white/50">
              <Building2 className="h-4 w-4" /> Havuz üye paneli
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}

function FloatingCards() {
  const cards = [
    { t: 'Dalga kademesi açıldı', s: 'Ayçiçek yağı → ₺1.800', c: 'text-[#5ef0c4]', x: '8%', y: '10%', d: 0 },
    { t: 'Kartınıza iade edildi', s: '+₺1.240 kademe farkı', c: 'text-[#f5b453]', x: '46%', y: '24%', d: 0.8 },
    { t: 'Sipariş yolda', s: '3 tedarikçi · 12 kalem', c: 'text-white', x: '14%', y: '40%', d: 1.6 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0">
      {cards.map((c, i) => (
        <motion.div
          key={i}
          className="absolute rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl"
          style={{ left: c.x, top: c.y }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: [0, -10, 0] }}
          transition={{ opacity: { delay: 0.3 + i * 0.2 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: c.d } }}
        >
          <div className={cn('text-sm font-semibold', c.c)}>{c.t}</div>
          <div className="text-xs text-white/55">{c.s}</div>
        </motion.div>
      ))}
    </div>
  );
}
