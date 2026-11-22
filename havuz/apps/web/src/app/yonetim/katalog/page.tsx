'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FolderPlus, Pencil, Plus, Search } from 'lucide-react';
import { CATEGORY_ICONS, formatTRY, toKurus, toLira, type AdminProductDTO, type CategoryIconName } from '@havuz/core';
import { ApiError, useAdminProducts, useCategories, useCreateCategory, useCreateProduct, useUpdateProduct } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { CategoryIcon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty';
import { cn } from '@/lib/cn';

export default function AdminCatalogPage() {
  const { data, isLoading, error, refetch } = useAdminProducts();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<AdminProductDTO | 'new' | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const list = useMemo(() => {
    const n = q.toLocaleLowerCase('tr-TR');
    return (data?.products ?? []).filter((p) => !n || `${p.name} ${p.sku} ${p.category.name}`.toLocaleLowerCase('tr-TR').includes(n));
  }, [data, q]);

  return (
    <div>
      <PageHeader
        title="Katalog"
        description="Standart ürün kartları. Piyasa referans fiyatı, üyelere gösterilen tasarrufun bazıdır; düzenli güncel tutun."
        action={
          <>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün ara" icon={<Search className="h-4 w-4" />} className="w-52" />
            <Button variant="secondary" onClick={() => setCatOpen(true)}>
              <FolderPlus className="h-4 w-4" /> Kategori
            </Button>
            <Button onClick={() => setEdit('new')}>
              <Plus className="h-4 w-4" /> Yeni ürün
            </Button>
          </>
        }
      />
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-fg-muted">
                  <th className="px-5 py-2.5 font-medium">Ürün</th>
                  <th className="px-3 py-2.5 font-medium">Kategori</th>
                  <th className="px-3 py-2.5 text-right font-medium">KDV</th>
                  <th className="px-3 py-2.5 text-right font-medium">Piyasa fiyatı</th>
                  <th className="px-3 py-2.5 text-right font-medium">En iyi teklif</th>
                  <th className="px-3 py-2.5 text-right font-medium">Teklif</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30" onClick={() => setEdit(p)}>
                    <td className="px-5 py-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-fg-subtle">
                        <span className="font-mono">{p.sku}</span> · {p.packLabel}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-2">
                        <CategoryIcon name={p.category.icon} size="sm" />
                        {p.category.name}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular">%{p.vatRate}</td>
                    <td className="px-3 py-3 text-right font-medium tabular">{formatTRY(p.marketPrice)}</td>
                    <td className="px-3 py-3 text-right tabular text-fg-muted">{p.bestPrice ? formatTRY(p.bestPrice) : '—'}</td>
                    <td className={cn('px-3 py-3 text-right tabular', p.offerCount === 0 && 'font-medium text-warning')}>{p.offerCount}</td>
                    <td className="px-5 py-3 text-right">
                      <Pencil className="ml-auto h-4 w-4 text-fg-subtle" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <ProductSheet value={edit} onClose={() => setEdit(null)} />
      <CategorySheet open={catOpen} onClose={() => setCatOpen(false)} />
    </div>
  );
}

function ProductSheet({ value, onClose }: { value: AdminProductDTO | 'new' | null; onClose: () => void }) {
  const cats = useCategories();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const editing = value && value !== 'new' ? value : null;
  const [f, setF] = useState({ categoryId: '', name: '', unit: '', packLabel: '', description: '', vatRate: '1', marketPrice: '' });
  useEffect(() => {
    if (!value) return;
    setF(
      editing
        ? { categoryId: editing.category.id, name: editing.name, unit: editing.unit, packLabel: editing.packLabel, description: editing.description, vatRate: String(editing.vatRate), marketPrice: String(toLira(editing.marketPrice)) }
        : { categoryId: cats.data?.categories[0]?.id ?? '', name: '', unit: 'kg', packLabel: '', description: '', vatRate: '1', marketPrice: '' },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function save() {
    const input = {
      categoryId: f.categoryId,
      name: f.name,
      unit: f.unit,
      packLabel: f.packLabel,
      description: f.description,
      vatRate: Number(f.vatRate) as 1 | 10 | 20,
      marketPrice: toKurus(Number(f.marketPrice)),
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input });
      else {
        const r = await create.mutateAsync(input);
        toast.success(`Ürün eklendi (${r.sku}). Tedarikçiler artık teklif verebilir.`);
      }
      if (editing) toast.success('Ürün güncellendi');
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    }
  }

  return (
    <Sheet
      open={!!value}
      onClose={onClose}
      title={editing ? `${editing.name} düzenle` : 'Yeni ürün kartı'}
      footer={
        <Button size="lg" className="w-full" loading={create.isPending || update.isPending} onClick={save}>
          Kaydet
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Kategori">
          <Select value={f.categoryId} onChange={set('categoryId')}>
            {cats.data?.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ürün adı" hint="Markasız standart ad: karşılaştırma bu kart üzerinden yapılır">
          <Input value={f.name} onChange={set('name')} placeholder="Örn. Ayçiçek Yağı" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Satış birimi" hint="Fiyat bu birim başınadır">
            <Input value={f.unit} onChange={set('unit')} placeholder="teneke, kg, koli…" />
          </Field>
          <Field label="Ambalaj">
            <Input value={f.packLabel} onChange={set('packLabel')} placeholder="18 L teneke" />
          </Field>
          <Field label="KDV oranı">
            <Select value={f.vatRate} onChange={set('vatRate')}>
              <option value="1">%1</option>
              <option value="10">%10</option>
              <option value="20">%20</option>
            </Select>
          </Field>
          <Field label="Piyasa referans fiyatı (₺, KDV hariç)">
            <Input type="number" step="0.01" value={f.marketPrice} onChange={set('marketPrice')} />
          </Field>
        </div>
        <Field label="Açıklama">
          <textarea
            value={f.description}
            onChange={set('description')}
            rows={3}
            maxLength={300}
            className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/15"
          />
        </Field>
      </div>
    </Sheet>
  );
}

function CategorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateCategory();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<CategoryIconName>('Package');
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Yeni kategori"
      footer={
        <Button
          size="lg"
          className="w-full"
          loading={create.isPending}
          onClick={async () => {
            try {
              await create.mutateAsync({ name, icon });
              toast.success('Kategori eklendi');
              setName('');
              onClose();
            } catch (e) {
              toast.error(e instanceof ApiError ? e.message : 'Kaydedilemedi');
            }
          }}
        >
          Kaydet
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Kategori adı">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Unlu Mamuller" />
        </Field>
        <Field label="Simge">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ICONS.map((i) => (
              <button key={i} type="button" onClick={() => setIcon(i)} className={cn('rounded-2xl p-1 ring-2 transition', icon === i ? 'ring-primary' : 'ring-transparent')} aria-label={i}>
                <CategoryIcon name={i} />
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Sheet>
  );
}
