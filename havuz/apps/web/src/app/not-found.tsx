import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export const metadata = { title: 'Sayfa bulunamadı', robots: { index: false } };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="max-w-md text-center">
        <Logo className="justify-center" />
        <div className="mx-auto mt-10 grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Compass className="h-8 w-8" />
        </div>
        <p className="mt-6 text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Aradığınız sayfa bulunamadı</h1>
        <p className="mt-3 text-fg-muted">Bağlantı eski olabilir ya da sayfa taşınmış olabilir.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg hover:opacity-90">
            Ana sayfa
          </Link>
          <Link href="/giris" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">
            Panele giriş
          </Link>
        </div>
      </div>
    </main>
  );
}
