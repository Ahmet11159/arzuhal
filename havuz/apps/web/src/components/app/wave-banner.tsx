'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Waves } from 'lucide-react';
import { formatTRYCompact, type WaveDTO } from '@havuz/core';
import { fmtLongDate } from '@/lib/format';
import { Countdown } from '../ui/countdown';

/** Açık dalga için sinematik kart: derinlikli gradyan, dalga animasyonu, geri sayım. */
export function WaveBanner({ wave, cta = { href: '/uye/dalga', label: 'Dalgaya katıl' } }: { wave: WaveDTO; cta?: { href: string; label: string } }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl bg-[#06120e] p-6 text-white shadow-[0_30px_70px_-30px_rgba(14,143,110,0.7)] sm:p-7"
    >
      <div aria-hidden className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#2cc79a]/30 blur-3xl" />
      <div aria-hidden className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[#f5b453]/15 blur-3xl" />
      <svg aria-hidden className="absolute inset-x-0 bottom-0 h-20 w-[200%] opacity-30 motion-safe:animate-[wave_12s_linear_infinite]" viewBox="0 0 1200 80" preserveAspectRatio="none">
        <path d="M0 40 Q 75 10 150 40 T 300 40 T 450 40 T 600 40 T 750 40 T 900 40 T 1050 40 T 1200 40 V80 H0Z" fill="#2cc79a" />
      </svg>
      <style>{`@keyframes wave{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-[#5ef0c4]">
            <Waves className="h-3.5 w-3.5" /> Açık dalga · {wave.region}
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">{wave.title}</h2>
          <p className="mt-1 text-sm text-white/60">Teslimat {fmtLongDate(wave.deliveryAt)}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[#5ef0c4]" /> {wave.memberCount} işletme katıldı
            </span>
            <span>Havuz hacmi {formatTRYCompact(wave.volume)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-4 md:items-end">
          <Countdown to={wave.cutoffAt} inverted />
          <Link href={cta.href} className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2cc79a] px-5 text-sm font-semibold text-[#03120d] transition hover:brightness-110 active:scale-[0.98]">
            {cta.label} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
