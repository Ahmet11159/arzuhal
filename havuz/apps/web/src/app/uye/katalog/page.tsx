'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, PackageSearch, Search, ShoppingCart, Waves, Zap } from 'lucide-react';
import { formatTRY, type ProductDTO } from '@havuz/core';
import { useCategories, useProducts } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty';
import { CategoryIcon } from '@/components/ui/icon';
import { ProductCard } from '@/components/catalog/product-card';
import { ProductSheet } from '@/components/catalog/product-sheet';
import { offerUnitPrice } from '@/components/catalog/pricing';
import { useCart } from '@/stores/cart';
import { cn } from '@/lib/cn';

export default function CatalogPage() {
  const [category, setCategory] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const query = useDeferredValue(q);
  const [open, setOpen] = useState<ProductDTO | null>(null);
  const mode = useCart((s) => s.mode);
  const setMode = useCart((s) => s.setMode);
  const lines = useCart((s) => s.lines);
  const cats = useCategories();
  const products = useProducts({ category, q: query || undefined });
  const all = useProducts({});

  const cart = useMemo(() => {
    const offers = new Map((all.data?.products ?? []).flatMap((p) => p.offers.map((o) => [o.id, o] as const)));
    let total = 0;
    let count = 0;
    for (const [id, qty] of Object.entries(lines)) {
      const o = offers.get(id);
      if (!o) continue;
      total += offerUnitPrice(o, mode, qty) * qty;
      count++;
    }
    return { total, count };
  }, [all.data, lines, mode]);

  const hasWave = !!all.data?.products.some((p) => p.offers.some((o) => o.wave));

  return (
    <div>
      <PageHeader
        title="Katalog"
        description="Standart ürün kartları, tedarikçi teklifleri yan yana. Dalgada fiyatlar havuz büyüdükçe düşer."
        action={
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'wave', label: <><Waves className="h-3.5 w-3.5" /> Dalga fiyatı</> },
              { value: 'direct', label: <><Zap className="h-3.5 w-3.5" /> Hemen teslim</> },
            ]}
          />
        }
      />

      {mode === 'wave' && !hasWave && !all.isLoading && (
        <div className="mb-5 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">Şu an açık bir dalga yok. Hemen teslim fiyatlarıyla sipariş verebilirsiniz.</div>
      )}

      <div className="sticky top-14 z-20 -mx-4 mb-6 space-y-3 bg-bg/85 px-4 pb-3 pt-1 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10 lg:pt-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün, ambalaj veya kategori ara…" icon={<Search className="h-4 w-4" />} aria-label="Katalogda ara" />
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            onClick={() => setCategory(undefined)}
            className={cn('shrink-0 rounded-xl border px-3.5 py-2 text-[13px] font-medium transition', !category ? 'border-fg bg-fg text-bg' : 'border-border bg-surface text-fg-muted hover:text-fg')}
          >
            Tümü
          </button>
          {cats.data?.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.slug === category ? undefined : c.slug)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-xl border py-1.5 pl-1.5 pr-3.5 text-[13px] font-medium transition',
                category === c.slug ? 'border-fg bg-fg text-bg' : 'border-border bg-surface text-fg-muted hover:text-fg',
              )}
            >
              <CategoryIcon name={c.icon} size="sm" className="h-6 w-6 rounded-md [&_svg]:h-3.5 [&_svg]:w-3.5" />
              {c.name}
              <span className="text-[11px] opacity-60">{c.productCount}</span>
            </button>
          ))}
        </div>
      </div>

      {products.error ? (
        <ErrorState message={products.error.message} onRetry={() => products.refetch()} />
      ) : products.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : products.data?.products.length === 0 ? (
        <EmptyState icon={<PackageSearch className="h-6 w-6" />} title="Sonuç bulunamadı" description="Farklı bir arama deneyin veya kategori filtresini kaldırın." />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {products.data?.products.map((p, i) => (
              <ProductCard key={p.id} p={p} mode={mode} index={i} onOpen={() => setOpen(p)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ProductSheet product={open} mode={mode} onClose={() => setOpen(null)} />

      <AnimatePresence>
        {cart.count > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed inset-x-4 bottom-[84px] z-30 mx-auto max-w-lg lg:bottom-6 lg:left-64 lg:right-0"
          >
            <Link href="/uye/sepet" className="flex items-center justify-between gap-4 rounded-2xl bg-fg py-3 pl-4 pr-3 text-bg shadow-lift transition hover:opacity-95">
              <span className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-bg/15">
                  <ShoppingCart className="h-[18px] w-[18px]" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{cart.count} ürün · {formatTRY(cart.total)}</span>
                  <span className="block text-xs opacity-60">{mode === 'wave' ? 'Dalga fiyatıyla, KDV hariç' : 'Hemen teslim, KDV hariç'}</span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-fg">
                Sepete git <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
