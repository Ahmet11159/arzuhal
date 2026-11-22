'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { formatPercent, formatTRY, savingRatio, toKurus, toLira, type PriceTier, type SupplierOfferDTO } from '@havuz/core';
import { useSupplierOffers, useUpdateOffer } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/ui/icon';
import { Field, Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty';
import { cn } from '@/lib/cn';
import { NewOfferSheet } from '@/components/catalog/new-offer-sheet';

export default function OffersPage() {
  const { data, isLoading, error, refetch } = useSupplierOffers();
  const [edit, setEdit] = useState<SupplierOfferDTO | null>(null);
  const [adding, setAdding] = useState(false);
  const update = useUpdateOffer();

  return (
    <div>
      <PageHeader
        title="Teklifler"
        description="Fiyat, kademe ve stok bilgilerinizi güncelleyin. Değişiklikler katalogda anında görünür."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Yeni teklif
          </Button>
        }
      />
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-fg-muted">
                  <th className="px-5 py-2.5 font-medium">Ürün</th>
                  <th className="px-3 py-2.5 text-right font-medium">Taban fiyat</th>
                  <th className="px-3 py-2.5 font-medium">Kademeler</th>
                  <th className="px-3 py-2.5 text-right font-medium">Stok</th>
                  <th className="px-3 py-2.5 text-right font-medium">Açık dalga</th>
                  <th className="px-3 py-2.5 text-center font-medium">Satışta</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data?.offers.map((o) => (
                  <tr key={o.id} className={cn('border-b border-border last:border-0', !o.active && 'opacity-55')}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <CategoryIcon name={o.product.categoryIcon} size="sm" />
                        <div>
                          <div className="flex items-center gap-1.5 font-medium">
                            {o.product.name}
                            {o.sponsored && <Sparkles className="h-3.5 w-3.5 text-accent" aria-label="Sponsorlu" />}
                          </div>
                          <div className="text-xs text-fg-subtle">
                            {o.product.packLabel} · 30 günde {o.last30Qty} {o.product.unit}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="font-semibold tabular">{formatTRY(o.basePrice)}</div>
                      <div className="text-[11px] text-success">piyasa −{formatPercent(savingRatio(o.product.marketPrice, o.basePrice))}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {o.tiers.map((t) => (
                          <Badge key={t.minQty} tone="primary">
                            {t.minQty}+ · {formatTRY(t.unitPrice)}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className={cn('px-3 py-3 text-right tabular', o.stock < o.last30Qty && 'font-medium text-warning')}>{o.stock}</td>
                    <td className="px-3 py-3 text-right tabular">
                      <span className="inline-flex items-center gap-1 text-fg-muted">
                        <Users className="h-3.5 w-3.5" /> {o.pooledQty}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Toggle
                        checked={o.active}
                        label={`${o.product.name} satışta`}
                        onChange={async (v) => {
                          try {
                            await update.mutateAsync({ id: o.id, input: { active: v } });
                            toast.success(v ? 'Satışa açıldı' : 'Satıştan kaldırıldı');
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'Hata');
                          }
                        }}
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEdit(o)}>
                        <Pencil className="h-3.5 w-3.5" /> Düzenle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <OfferEditor offer={edit} onClose={() => setEdit(null)} />
      <NewOfferSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', checked ? 'bg-primary' : 'bg-border')}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
}

function OfferEditor({ offer, onClose }: { offer: SupplierOfferDTO | null; onClose: () => void }) {
  const update = useUpdateOffer();
  const [base, setBase] = useState('');
  const [stock, setStock] = useState('');
  const [lead, setLead] = useState('');
  const [tiers, setTiers] = useState<{ minQty: string; price: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!offer) return;
    setBase(String(toLira(offer.basePrice)));
    setStock(String(offer.stock));
    setLead(String(offer.leadTimeDays));
    setTiers(offer.tiers.map((t) => ({ minQty: String(t.minQty), price: String(toLira(t.unitPrice)) })));
    setErr(null);
  }, [offer]);

  async function save() {
    const payload = {
      basePrice: toKurus(Number(base)),
      stock: Math.floor(Number(stock)),
      leadTimeDays: Math.floor(Number(lead)),
      tiers: tiers.map<PriceTier>((t) => ({ minQty: Math.floor(Number(t.minQty)), unitPrice: toKurus(Number(t.price)) })).sort((a, b) => a.minQty - b.minQty),
    };
    if (!payload.basePrice || payload.tiers.some((t) => !t.minQty || !t.unitPrice)) return setErr('Tüm alanları geçerli sayılarla doldurun');
    try {
      await update.mutateAsync({ id: offer!.id, input: payload });
      toast.success('Teklif güncellendi');
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Kaydedilemedi');
    }
  }

  return (
    <Sheet
      open={!!offer}
      onClose={onClose}
      title={offer ? `${offer.product.name} teklifi` : ''}
      footer={
        <Button size="lg" className="w-full" onClick={save} loading={update.isPending}>
          Kaydet
        </Button>
      }
    >
      {offer && (
        <div className="space-y-5">
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
          <p className="text-xs text-fg-muted">Piyasa referans fiyatı: {formatTRY(offer.product.marketPrice)} / {offer.product.unit} (KDV hariç)</p>
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
                  <Field label={i === 0 ? `Minimum miktar (${offer.product.unit})` : ''}>
                    <Input type="number" value={t.minQty} onChange={(e) => setTiers((all) => all.map((x, j) => (j === i ? { ...x, minQty: e.target.value } : x)))} />
                  </Field>
                  <Field label={i === 0 ? 'Birim fiyat (₺)' : ''}>
                    <Input type="number" step="0.01" value={t.price} onChange={(e) => setTiers((all) => all.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                  </Field>
                  <button className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-fg-subtle hover:bg-danger-soft hover:text-danger" onClick={() => setTiers((all) => all.filter((_, j) => j !== i))} aria-label="Kademeyi sil">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-fg-subtle">Her kademe bir öncekinden ucuz olmalı. Dalgada havuzlanan toplam miktar bu eşiklere göre fiyatlanır.</p>
          </div>
          {err && <p className="text-sm text-danger">{err}</p>}
        </div>
      )}
    </Sheet>
  );
}
