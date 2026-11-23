'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/** Sayfa düzeyinde beklenmeyen hata: kullanıcıya Türkçe açıklama ve yeniden deneme. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[sayfa hatası]', error);
  }, [error]);
  return (
    <main className="grid min-h-[70dvh] place-items-center px-6 py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-danger-soft text-danger">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Bir şeyler ters gitti</h1>
        <p className="mt-3 text-fg-muted">Sayfa yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin; sorun sürerse destek ekibine yazın.</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-fg-subtle">Hata kodu: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg hover:opacity-90">
            <RotateCcw className="h-4 w-4" /> Tekrar dene
          </button>
          <Link href="/" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">
            Ana sayfa
          </Link>
        </div>
      </div>
    </main>
  );
}
