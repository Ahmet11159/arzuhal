'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Check, ClipboardList, FileUp, Truck, Waves, X, Zap } from 'lucide-react';
import { InvoiceSheet } from '@/components/invoice/invoice-sheet';
import { formatTRY, ITEM_STATUS_LABEL, ITEM_TRANSITIONS, PAYOUT_STATUS_LABEL, type ItemStatus, type SupplierOrderItemDTO } from '@havuz/core';
import { useSupplierItems, useUpdateSupplierItem } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/ui/segmented';
import { CategoryIcon } from '@/components/ui/icon';
import { EmptyState, ErrorState } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtDate, fmtDateTime } from '@/lib/format';

type Tab = 'pending' | 'confirmed' | 'shipped' | 'done';
const NEXT_ACTION: Partial<Record<ItemStatus, { to: ItemStatus; label: string; icon: typeof Check }>> = {
  pending: { to: 'confirmed', label: 'Onayla', icon: Check },
  confirmed: { to: 'shipped', label: 'Sevk et', icon: Truck },
  shipped: { to: 'delivered', label: 'Teslim edildi', icon: Check },
};

export default function SupplierOrders() {
  const { data, isLoading, error, refetch } = useSupplierItems();
  const update = useUpdateSupplierItem();
  const [tab, setTab] = useState<Tab>('pending');
  const [busy, setBusy] = useState(false);
  const [invoiceFor, setInvoiceFor] = useState<{ orderId: string; orderNumber: string; member: string } | null>(null);

  // Teslim edilmiş ama faturası yüklenmemiş siparişler (sipariş başına bir fatura)
  const needInvoice = useMemo(() => {
    const m = new Map<string, { orderId: string; orderNumber: string; member: string; total: number }>();
    for (const i of data?.items ?? []) {
      if (i.status !== 'delivered' || i.invoiceUploaded) continue;
      const e = m.get(i.orderId) ?? { orderId: i.orderId, orderNumber: i.orderNumber, member: i.member.name, total: 0 };
      e.total += i.qty * i.unitPrice;
      m.set(i.orderId, e);
    }
    return [...m.values()];
  }, [data]);

  const counts = useMemo(() => {
    const c = { pending: 0, confirmed: 0, shipped: 0, done: 0 };
    for (const i of data?.items ?? []) {
      if (i.status === 'pending') c.pending++;
      else if (i.status === 'confirmed') c.confirmed++;
      else if (i.status === 'shipped') c.shipped++;
      else c.done++;
    }
    return c;
  }, [data]);

  const items = useMemo(
    () => (data?.items ?? []).filter((i) => (tab === 'done' ? i.status === 'delivered' || i.status === 'cancelled' : i.status === tab)),
    [data, tab],
  );

  // Sevkiyat planlaması için müşteriye göre grupla
  const groups = useMemo(() => {
    const m = new Map<string, { member: SupplierOrderItemDTO['member']; items: SupplierOrderItemDTO[] }>();
    for (const i of items) {
      const g = m.get(i.member.id) ?? { member: i.member, items: [] };
      g.items.push(i);
      m.set(i.member.id, g);
    }
    return [...m.values()];
  }, [items]);

  async function move(ids: string[], to: ItemStatus) {
    setBusy(true);
    try {
      for (const id of ids) await update.mutateAsync({ id, input: { status: to } });
      toast.success(`${ids.length} kalem → ${ITEM_STATUS_LABEL[to]}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Güncellenemedi');
    } finally {
      setBusy(false);
    }
  }

  const action = tab !== 'done' ? NEXT_ACTION[tab] : undefined;

  return (
    <div>
      <PageHeader
        title="Sipariş kalemleri"
        description="Havuz üzerinden gelen siparişleri onaylayın, sevk edin. Kalemler müşteriye göre gruplanır."
        action={
          action &&
          items.length > 0 && (
            <Button loading={busy} onClick={() => move(items.map((i) => i.id), action.to)}>
              <action.icon className="h-4 w-4" /> Tümünü {action.label.toLocaleLowerCase('tr-TR')} ({items.length})
            </Button>
          )
        }
      />
      <Segmented
        className="mb-5 w-full overflow-x-auto sm:w-auto"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pending', label: `Onay bekleyen · ${counts.pending}` },
          { value: 'confirmed', label: `Hazırlanan · ${counts.confirmed}` },
          { value: 'shipped', label: `Yolda · ${counts.shipped}` },
          { value: 'done', label: 'Tamamlanan' },
        ]}
      />
      {tab === 'done' && needInvoice.length > 0 && (
        <Card className="mb-4 overflow-hidden border-warning/30">
          <div className="border-b border-border bg-warning-soft/60 px-5 py-3 text-sm font-semibold text-warning">
            Faturası yüklenmemiş teslimatlar · {needInvoice.length}
          </div>
          <ul className="divide-y divide-border">
            {needInvoice.slice(0, 30).map((o) => (
              <li key={o.orderId} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
                <span className="font-mono text-xs">{o.orderNumber}</span>
                <span className="min-w-0 flex-1 truncate text-fg-muted">{o.member}</span>
                <span className="text-xs text-fg-subtle tabular">KDV hariç {formatTRY(o.total)}</span>
                <Button size="sm" variant="secondary" onClick={() => setInvoiceFor(o)}>
                  <FileUp className="h-3.5 w-3.5" /> Fatura yükle
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : groups.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="Bu aşamada kalem yok" description="Yeni siparişler geldiğinde burada görünür." />
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {groups.slice(0, 40).map((g) => (
              <motion.div key={g.member.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
                <Card className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-3">
                    <div>
                      <span className="text-sm font-semibold">{g.member.name}</span>
                      <span className="ml-2 text-xs text-fg-muted">{g.member.district}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular">{formatTRY(g.items.reduce((a, i) => a + i.qty * i.unitPrice, 0))}</span>
                      {action && (
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => move(g.items.map((i) => i.id), action.to)}>
                          <action.icon className="h-3.5 w-3.5" /> {action.label}
                        </Button>
                      )}
                    </div>
                  </div>
                  <ul className="divide-y divide-border">
                    <AnimatePresence initial={false}>
                      {g.items.map((i) => (
                        <motion.li key={i.id} layout exit={{ opacity: 0, x: 40 }} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:flex-nowrap">
                          <CategoryIcon name={i.categoryIcon} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">
                              {i.productName} <span className="text-fg-muted">· {i.qty} {i.unit}</span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                              <span className="font-mono">{i.orderNumber}</span>
                              <span>{fmtDateTime(i.createdAt)}</span>
                              {i.wave ? (
                                <Badge tone="primary">
                                  <Waves className="h-3 w-3" /> {i.wave.code} · teslim {fmtDate(i.wave.deliveryAt)}
                                </Badge>
                              ) : (
                                <Badge tone="accent">
                                  <Zap className="h-3 w-3" /> Hemen
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="w-24 text-right text-sm font-semibold tabular">{formatTRY(i.qty * i.unitPrice)}</span>
                          {tab === 'done' ? (
                            <span className="flex flex-col items-end gap-1">
                              <Badge tone={i.status === 'delivered' ? 'success' : 'neutral'}>{ITEM_STATUS_LABEL[i.status]}</Badge>
                              {i.status !== 'cancelled' && (
                                <span className="text-[11px] text-fg-subtle">{PAYOUT_STATUS_LABEL[i.payoutStatus]}</span>
                              )}
                            </span>
                          ) : (
                            <div className="flex gap-1">
                              {ITEM_TRANSITIONS[i.status].includes('cancelled') && (
                                <button
                                  disabled={busy}
                                  onClick={() => move([i.id], 'cancelled')}
                                  className="grid h-8 w-8 place-items-center rounded-lg text-fg-subtle hover:bg-danger-soft hover:text-danger"
                                  aria-label="İptal et"
                                  title="İptal et (stok geri eklenir)"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                              {NEXT_ACTION[i.status] && (
                                <Button size="sm" disabled={busy} onClick={() => move([i.id], NEXT_ACTION[i.status]!.to)}>
                                  {NEXT_ACTION[i.status]!.label}
                                </Button>
                              )}
                            </div>
                          )}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <InvoiceSheet target={invoiceFor} onClose={() => setInvoiceFor(null)} />
    </div>
  );
}
