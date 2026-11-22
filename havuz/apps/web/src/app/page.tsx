import Link from 'next/link';
import { Hero } from '@/components/landing/hero';
import { SiteNav } from '@/components/landing/site-nav';
import { HowItWorks, Pricing, SupplierSection, TrustStrip, ValueProps } from '@/components/landing/sections';
import { TierDemo } from '@/components/landing/tier-demo';
import { SavingsCalculator } from '@/components/landing/savings-calculator';
import { LeadForm } from '@/components/landing/lead-form';
import { Reveal, SectionHeading } from '@/components/landing/reveal';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/app/theme-toggle';

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <TrustStrip />
        <ValueProps />
        <HowItWorks />

        <section className="container py-24 sm:py-32">
          <SectionHeading
            eyebrow="Kademeli fiyat"
            title="Hacim biriktikçe herkesin fiyatı düşer"
            description="Kaydırıcıyı oynatın: havuzdaki toplam sipariş arttıkça kademeler açılır. Bu, platformun gerçek fiyat motorudur."
          />
          <Reveal className="mt-12">
            <TierDemo />
          </Reveal>
        </section>

        <section id="tasarruf" className="container pb-24 sm:pb-32">
          <SectionHeading eyebrow="Tasarruf hesaplayıcı" title="İşletmeniz ne kadar kazanır?" />
          <Reveal className="mt-12">
            <SavingsCalculator />
          </Reveal>
        </section>

        <Pricing />
        <SupplierSection />

        <section id="basvuru" className="relative overflow-hidden border-t border-border py-24 sm:py-32">
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
          <div className="container grid items-start gap-12 lg:grid-cols-[1fr_520px]">
            <SectionHeading
              eyebrow="Ağa katıl"
              title="Bir sonraki dalgada siz de olun"
              description="Başvurunuzu bırakın; bölge ekibimiz hesabınızı açsın, mevcut tedarik listenizi inceleyip ilk ay tasarruf analizinizi hazırlasın. Taahhüt yok, üyelik ücretsiz."
            />
            <Reveal delay={0.1}>
              <LeadForm />
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <div className="container flex flex-col items-center justify-between gap-6 text-sm text-fg-muted sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} Havuz · Bağımsız işletmelerin ortak satın alma ağı</p>
          <div className="flex items-center gap-2">
            <Link href="/giris" className="hover:text-fg">
              Giriş
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </>
  );
}
