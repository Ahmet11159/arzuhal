'use client';

import { motion } from 'framer-motion';
import {
  BadgeCheck,
  BarChart3,
  CalendarClock,
  Check,
  FileText,
  HandCoins,
  LineChart,
  PackageCheck,
  Repeat,
  ShoppingBasket,
  Truck,
  Users,
  Waves,
  Zap,
} from 'lucide-react';
import { formatTRYWhole, PRO_MONTHLY_FEE } from '@havuz/core';
import { TiltCard } from '../ui/tilt';
import { Reveal, SectionHeading } from './reveal';
import { cn } from '@/lib/cn';

export function ValueProps() {
  const items = [
    {
      icon: HandCoins,
      title: 'Fiyat gücü',
      text: 'Yüzlerce işletmenin hacmi tek bir alıcı gibi pazarlık eder. Kademe aşıldıkça herkesin fiyatı düşer.',
      stat: '%8–19',
      statLabel: 'kategori bazında hedef tasarruf',
    },
    {
      icon: ShoppingBasket,
      title: 'Tek ekran, tek fatura',
      text: '8–10 tedarikçiyle WhatsApp trafiği yerine tek sepet. Ay sonunda konsolide fatura, tek ödeme.',
      stat: '1',
      statLabel: 'sepet, tüm tedarikçiler',
    },
    {
      icon: CalendarClock,
      title: 'Vadeli ödeme',
      text: 'Tedarikçi peşin tahsil eder, siz 30–60 gün vadeyle ödersiniz. Limitiniz sipariş geçmişinizle büyür.',
      stat: '60 gün',
      statLabel: 'Pro üyelerde vade',
    },
  ];
  return (
    <section className="container py-24 sm:py-32">
      <SectionHeading
        eyebrow="Neden Havuz"
        title={
          <>
            Tek başına küçüksün. <span className="text-fg-muted">Birlikte bir zincirsin.</span>
          </>
        }
        description="Bağımsız işletmeler, zincirlerin sahip olduğu üç avantajdan mahrum: fiyat gücü, operasyon kolaylığı ve veri. Havuz üçünü birden verir."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={i * 0.08}>
            <TiltCard className="h-full rounded-3xl">
              <div className="flex h-full flex-col rounded-3xl border border-border bg-surface p-6 shadow-card">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary [transform:translateZ(30px)]">
                  <it.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{it.title}</h3>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-fg-muted">{it.text}</p>
                <div className="mt-6 border-t border-border pt-4 [transform:translateZ(20px)]">
                  <div className="text-2xl font-semibold tracking-tight">{it.stat}</div>
                  <div className="text-xs text-fg-subtle">{it.statLabel}</div>
                </div>
              </div>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { icon: ShoppingBasket, title: 'Sepetini oluştur', text: 'Standart ürün kartlarından, birden çok tedarikçinin teklifini yan yana görerek seç.' },
    { icon: Waves, title: 'Dalgaya katıl', text: 'Haftalık toplu sipariş dalgasına ekle. Perşembe 18:00’de kapanır, cumartesi teslim.' },
    { icon: Users, title: 'Hacim birikir', text: 'Diğer işletmelerin siparişleri havuzda birleşir. Her kademe aşıldığında birim fiyat düşer.' },
    { icon: PackageCheck, title: 'Teslim al, kontrol et', text: 'Mal kabulde eksik veya hasarı tek dokunuşla bildir. Onaylanan iade kredine geçer.' },
  ];
  return (
    <section id="nasil" className="relative border-y border-border bg-muted/40 py-24 sm:py-32">
      <div className="container">
        <SectionHeading eyebrow="Nasıl çalışır" title="Dört adımda zincir fiyatı" center />
        <div className="relative mt-16 grid gap-6 md:grid-cols-4">
          <div aria-hidden className="absolute left-0 right-0 top-7 hidden h-px md:block">
            <motion.div
              className="h-full origin-left bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={0.15 + i * 0.12} className="relative text-center">
              <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-border bg-surface text-primary shadow-card">
                <s.icon className="h-6 w-6" />
                <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-fg">{i + 1}</span>
              </div>
              <h3 className="mt-5 font-semibold">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-[240px] text-sm leading-relaxed text-fg-muted">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SupplierSection() {
  const perks = [
    { icon: LineChart, title: 'Talep tahmini', text: 'Dalga açıkken toplanan hacmi ve kapanış projeksiyonunu canlı görün; üretim ve rota planlayın.' },
    { icon: Zap, title: 'Sıfır tahsilat riski', text: 'Ödemeyi Havuz garanti eder. Vadeli satışın finansmanı ve takibi bizde.' },
    { icon: Truck, title: 'Yoğun rotalar', text: 'Aynı semtte toplanan siparişler daha az sefer, daha dolu araç demek.' },
    { icon: BarChart3, title: 'Performans karnesi', text: 'Zamanında teslim ve iade oranınız şeffaf; iyi puan daha fazla görünürlük getirir.' },
  ];
  return (
    <section id="tedarikci" className="container py-24 sm:py-32">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <SectionHeading
          eyebrow="Tedarikçiler için"
          title="Dağınık küçük siparişler yerine öngörülebilir toplu hacim"
          description="Yeni müşteri bulma maliyeti, tahsilat riski ve dağınık sevkiyat yükü ortadan kalkar. Karşılığında satış başına şeffaf bir komisyon ödersiniz."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {perks.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.07}>
              <div className="h-full rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                <p.icon className="h-5 w-5 text-accent" />
                <h3 className="mt-3 font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  const plans = [
    {
      name: 'Temel',
      price: 'Ücretsiz',
      sub: 'Ağa katılmak için',
      features: ['Tüm katalog ve dalga fiyatları', 'Haftalık toplu sipariş dalgaları', 'Tek ekrandan çoklu tedarikçi', '30 gün vade (%1,5 vade farkı)', 'Mal kabul ve iade takibi'],
      cta: 'Ücretsiz başla',
      highlight: false,
    },
    {
      name: 'Pro',
      price: `${formatTRYWhole(PRO_MONTHLY_FEE)}`,
      sub: 'aylık, işletme başına',
      features: ['Temel’deki her şey', 'Emsal işletme fiyat karşılaştırması', '60 gün vade, düşük vade farkı (%0,9)', 'Daha yüksek vadeli limit', 'Kategori bazlı harcama analitiği', 'Öncelikli destek'],
      cta: 'Pro ile başla',
      highlight: true,
    },
  ];
  return (
    <section id="fiyat" className="border-t border-border bg-muted/40 py-24 sm:py-32">
      <div className="container">
        <SectionHeading eyebrow="Üyelik" title="Tasarrufunuzun küçük bir kesri" description="Pro üyelik, ortalama bir kafenin aylık tasarrufunun yalnızca bir kısmına denk gelir." center />
        <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.1}>
              <div
                className={cn(
                  'relative h-full overflow-hidden rounded-3xl border p-7',
                  p.highlight ? 'border-transparent bg-[#06120e] text-white shadow-[0_30px_80px_-30px_rgba(14,143,110,0.8)]' : 'border-border bg-surface shadow-card',
                )}
              >
                {p.highlight && <div aria-hidden className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#2cc79a]/25 blur-3xl" />}
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    {p.highlight && <span className="rounded-full bg-[#f5b453] px-2.5 py-0.5 text-xs font-semibold text-[#2a1800]">En çok tercih edilen</span>}
                  </div>
                  <div className="mt-5 text-4xl font-semibold tracking-tight">{p.price}</div>
                  <div className={cn('text-sm', p.highlight ? 'text-white/55' : 'text-fg-muted')}>{p.sub}</div>
                  <ul className="mt-7 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[15px]">
                        <Check className={cn('mt-0.5 h-4 w-4 shrink-0', p.highlight ? 'text-[#5ef0c4]' : 'text-primary')} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#basvuru"
                    className={cn(
                      'mt-8 flex h-12 items-center justify-center rounded-xl text-[15px] font-semibold transition active:scale-[0.98]',
                      p.highlight ? 'bg-[#2cc79a] text-[#03120d] hover:brightness-110' : 'border border-border bg-surface hover:bg-muted',
                    )}
                  >
                    {p.cta}
                  </a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustStrip() {
  const items = [
    { icon: BadgeCheck, text: 'Standart ürün kartları' },
    { icon: FileText, text: 'e-Fatura uyumlu konsolide fatura' },
    { icon: Repeat, text: 'Tekrarlayan sepet şablonları' },
    { icon: PackageCheck, text: 'Fotoğraflı mal kabul' },
  ];
  return (
    <div className="container -mt-6 pb-4">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-fg-muted">
        {items.map((i) => (
          <span key={i.text} className="inline-flex items-center gap-2">
            <i.icon className="h-4 w-4 text-primary" />
            {i.text}
          </span>
        ))}
      </div>
    </div>
  );
}
