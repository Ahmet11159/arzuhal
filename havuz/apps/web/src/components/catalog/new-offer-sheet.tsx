'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Trash2 } from 'lucide-react';
import { formatTRY, toKurus, type ProductDTO } from '@havuz/core';
import { ApiError, useCreateOffer, useMe, useProducts } from '@havuz/sdk';
import { Sheet } from '../ui/sheet';
import { Button } from '../ui/button';
import { Field, Input } from '../ui/input';
import { CategoryIcon } from '../ui/icon';
import { cn } from '@/lib/cn';

/** Tedarikçi: katalogda henüz teklif vermediği bir ürüne fiyat, kademe ve stokla teklif açar. */
export function NewOfferSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe();
  const products = useProducts({});
  const create = useCreateOffer();
  const [q, setQ] = useState('');
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [base, setBase] = useState('');
  const [stock, setStock] = useState('');
  const [lead, setLead] = useState('1');
  const [tiers, setTiers] = useState<{ minQty: string; price: string }[]>([]);

  const available = useMemo(() => {
    const myOrg = me.data?.user.org.id;
    const needle = q.toLocaleLowerCase('tr-TR');
    return (products.data?.products ?? [])
      .filter((p) => !p.offers.some((o) => o.supplier.id === myOrg))
      .filter((p) => !needle || `${p.name} ${p.packLabel} ${p.category.name}`.toLocaleLowerCase('tr-TR').includes(needle));
  }, [products.data, me.data, q]);

  const reset = () => {
    setProduct(null);
    setBase('');
    setStock('');
    setLead('1');
    setTiers([]);
    setQ('');
  };

  async function save() {
    if (!product) return;
    try {
      await create.mutateAsync({
        productId: product.id,
        basePrice: toKurus(Number(base)),
        stock: Math.floor(Number(stock)),
        leadTimeDays: Math.floor(Number(lead)),
        tiers: tiers.filter((t) => t.minQty && t.price).map((t) => ({ minQty: Math.floor(Number(t.minQty)), unitPrice: toKurus(Number(t.price)) })),
      });
      toast.success(`${product.name} için teklifiniz yayında`);
      reset();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={product ? `${product.name} için teklif` : 'Yeni teklif'}
      footer={
        product ? (
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setProduct(null)}>
              Geri
            </Button>
            <Button className="flex-1" size="lg" loading={create.isPending} disabled={!base || !stock} onClick={save}>
              Teklifi yayınla
            </Button>
          </div>
        ) : undefined
      }
    >
      {!product ? (
        <div className="space-y-4">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün ara" icon={<Search className="h-4 w-4" />} />
          <p className="text-xs text-fg-muted">Yalnızca henüz teklif vermediğiniz ürünler listelenir. Listede olmayan bir ürün için Havuz ekibinden katalog kaydı isteyin.</p>
          <ul className="space-y-2">
            {available.map((p) => (
              <li key={p.id}>
                <button onClick={() => setProduct(p)} className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left transition hover:border-primary/50 hover:bg-muted/40">
                  <CategoryIcon name={p.category.icon} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-fg-muted">
                      {p.packLabel} · {p.offers.length} rakip teklif · piyasa {formatTRY(p.marketPrice)}
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-fg-subtle" />
                </button>
              </li>
            ))}
            {available.length === 0 && <li className="py-8 text-center text-sm text-fg-muted">Teklif verebileceğiniz ürün bulunamadı.</li>}
          </ul>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl bg-muted/50 p-4 text-sm">
            <div className="font-medium">{product.packLabel}</div>
            <div className="mt-1 text-fg-muted">
              Piyasa referansı {formatTRY(product.marketPrice)} / {product.unit} · KDV %{product.vatRate} (fiyatlar KDV hariç)
            </div>
            {product.offers.length > 0 && (
              <div className="mt-1 text-fg-muted">En düşük mevcut teklif: {formatTRY(Math.min(...product.offers.map((o) => o.basePrice)))}</div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Taban fiyat (₺)">
              <Input type="number" inputMode="decimal" step="0.01" value={base} onChange={(e) => setBase(e.target.value)} />
            </Field>
            <Field label="Stok">
              <Input type="number" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
            </Field>
            <Field label="Teslim (gün)">
              <Input type="number" inputMode="numeric" value={lead} onChange={(e) => setLead(e.target.value)} />
            </Field>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Hacim kademeleri</span>
              <Button size="sm" variant="ghost" onClick={() => setTiers((t) => [...t, { minQty: '', price: '' }])} disabled={tiers.length >= 6}>
                <Plus className="h-3.5 w-3.5" /> Kademe ekle
              </Button>
            </div>
            <div className="space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="flex items-end gap-2">
                  <Field label={i === 0 ? `Minimum (${product.unit})` : ''}>
                    <Input type="number" value={t.minQty} onChange={(e) => setTiers((all) => all.map((x, j) => (j === i ? { ...x, minQty: e.target.value } : x)))} />
                  </Field>
                  <Field label={i === 0 ? 'Birim fiyat (₺)' : ''}>
                    <Input type="number" step="0.01" value={t.price} onChange={(e) => setTiers((all) => all.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                  </Field>
                  <button className={cn('mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-fg-subtle hover:bg-danger-soft hover:text-danger')} onClick={() => setTiers((all) => all.filter((_, j) => j !== i))} aria-label="Kademeyi sil">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-fg-subtle">Kademeler havuzdaki toplam miktara uygulanır; her kademe bir öncekinden ucuz olmalı. Kademe eklemek dalga siparişlerinde sizi öne çıkarır.</p>
          </div>
        </div>
      )}
    </Sheet>
  );
}
