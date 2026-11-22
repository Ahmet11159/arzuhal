'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles, Users, Truck, TrendingDown } from 'lucide-react';
import { formatPercent } from '@havuz/core';
import { usePublicStats } from '@havuz/sdk';
import { useRef } from 'react';
import { Countdown } from '../ui/countdown';
import { AnimatedNumber } from '../ui/animated-number';

const NetworkScene = dynamic(() => import('../three/network-scene'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center"><div className="h-40 w-40 animate-pulse rounded-full bg-[#2cc79a]/10 blur-2xl" /></div>,
});

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const reduced = useReducedMotion();
  const { data: stats } = usePublicStats();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const sceneY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const sceneOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);

  return (
    <section ref={ref} className="relative isolate overflow-hidden bg-[#050d0a] text-white">
      {/* Arka plan katmanları */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_40%,rgba(44,199,154,0.18),transparent_70%),radial-gradient(40%_40%_at_20%_80%,rgba(245,180,83,0.10),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <motion.div style={{ y: sceneY, opacity: sceneOpacity }} className="absolute inset-0 -z-10 lg:left-[38%]">
        <div className="absolute inset-0 translate-y-[18%] opacity-45 sm:translate-y-0 sm:opacity-70 lg:opacity-100">
          <NetworkScene reducedMotion={!!reduced} />
        </div>
      </motion.div>
      {/* Mobilde metin okunurluğu için koyu katman */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#050d0a]/85 via-[#050d0a]/40 to-transparent lg:from-[#050d0a]/60 lg:via-transparent" />

      <div className="container relative flex min-h-[100dvh] flex-col justify-center pb-20 pt-28 lg:min-h-[max(100dvh,780px)]">
        <div className="max-w-[620px]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
            <Link
              href="#dalga"
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-[13px] text-white/80 backdrop-blur transition hover:border-white/20"
            >
              <span className="relative flex h-6 items-center gap-1.5 rounded-full bg-[#2cc79a]/15 px-2 text-[12px] font-medium text-[#5ef0c4]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-[#5ef0c4]" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#5ef0c4]" />
                </span>
                Canlı
              </span>
              {stats?.openWave ? `${stats.openWave.title} sipariş alıyor` : 'Haftalık dalgalar her perşembe kapanır'}
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08, ease }}
            className="mt-6 text-balance text-[42px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-6xl lg:text-[68px]"
          >
            Bağımsız işletmeler,{' '}
            <span className="bg-gradient-to-r from-[#5ef0c4] via-[#2cc79a] to-[#f5b453] bg-[length:200%_auto] bg-clip-text text-transparent motion-safe:animate-gradient-x">
              zincir gücüyle
            </span>{' '}
            alır.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.16, ease }}
            className="mt-5 max-w-[540px] text-[17px] leading-relaxed text-white/65"
          >
            Havuz; kafe ve restoranların satın alma hacmini birleştirir, tedarikçilerden kademeli fiyat alır ve tüm siparişi tek ekrana,
            tek faturaya, vadeli ödemeye indirir.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.24, ease }} className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#basvuru"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-[#2cc79a] px-6 text-[15px] font-semibold text-[#03120d] shadow-[0_10px_40px_-10px_rgba(44,199,154,0.9)] transition hover:brightness-110 active:scale-[0.98]"
            >
              Ağa ücretsiz katıl
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/giris"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 text-[15px] font-medium text-white backdrop-blur transition hover:bg-white/[0.08]"
            >
              <Sparkles className="h-4 w-4 text-[#f5b453]" />
              Canlı demoyu aç
            </Link>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.45 }}
            className="mt-12 grid max-w-[560px] grid-cols-3 gap-3 border-t border-white/10 pt-6"
          >
            {[
              { icon: Users, label: 'Üye işletme', value: stats?.members ?? 0, fmt: (n: number) => String(n) },
              { icon: Truck, label: 'Tedarikçi', value: stats?.suppliers ?? 0, fmt: (n: number) => String(n) },
              { icon: TrendingDown, label: 'Tasarruf oranı', value: Math.round((stats?.avgSavingRate ?? 0) * 1000), fmt: (n: number) => formatPercent(n / 1000) },
            ].map((s) => (
              <div key={s.label}>
                <dt className="flex items-center gap-1.5 text-[12.5px] text-white/50">
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular sm:text-[28px]">{stats ? <AnimatedNumber value={s.value} format={s.fmt} /> : '—'}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        {stats?.openWave && (
          <motion.div
            id="dalga"
            initial={{ opacity: 0, y: 30, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.6, ease }}
            style={{ transformPerspective: 900 }}
            className="mt-10 w-full max-w-[380px] rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl lg:absolute lg:bottom-16 lg:right-6 lg:mt-0"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] uppercase tracking-wider text-white/45">Açık dalga</div>
                <div className="mt-0.5 font-semibold">{stats.openWave.title}</div>
              </div>
              <span className="rounded-full bg-[#f5b453]/15 px-2 py-0.5 text-[11.5px] font-medium text-[#f5b453]">{stats.openWave.memberCount} işletme katıldı</span>
            </div>
            <div className="mt-4">
              <Countdown to={stats.openWave.cutoffAt} compact inverted />
            </div>
          </motion.div>
        )}
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[#050d0a]" />
    </section>
  );
}
