import Link from 'next/link';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/app/theme-toggle';

export const LEGAL_LINKS = [
  { href: '/hakkimizda', label: 'Hakkımızda' },
  { href: '/iletisim', label: 'İletişim' },
  { href: '/kullanim-kosullari', label: 'Kullanım koşulları' },
  { href: '/satis-sozlesmesi', label: 'Satış sözleşmesi' },
  { href: '/iptal-iade', label: 'İptal, iade ve teslimat' },
  { href: '/kvkk', label: 'KVKK aydınlatma metni' },
  { href: '/gizlilik', label: 'Gizlilik ve çerezler' },
] as const;

/** Herkese açık sayfaların alt bilgisi: yasal bağlantılar ve güvenli ödeme bandı. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/60">
      <div className="container grid gap-8 py-10 sm:grid-cols-[1.2fr_2fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-fg-muted">Bağımsız kafe ve restoranların ortak satın alma ağı.</p>
          <ThemeToggle />
        </div>
        <nav aria-label="Yasal bilgiler" className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-fg-muted hover:text-fg">
              {l.label}
            </Link>
          ))}
          <Link href="/giris" className="text-fg-muted hover:text-fg">
            Giriş
          </Link>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-3 py-5 text-xs text-fg-subtle sm:flex-row">
          <p>© {new Date().getFullYear()} Havuz · Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap items-center gap-2" aria-label="Güvenli ödeme">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 font-medium text-fg-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> iyzico ile güvenli ödeme
            </span>
            {['Visa', 'Mastercard', 'Troy', 'American Express'].map((b) => (
              <span key={b} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 font-semibold tracking-tight text-fg-muted">
                <CreditCard className="h-3.5 w-3.5" /> {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
