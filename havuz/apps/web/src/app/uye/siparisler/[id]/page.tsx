'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, Camera, Check, Gift, PackageCheck, Repeat } from 'lucide-react';
import {
  formatTRY,
  ISSUE_STATUS_LABEL,
  ISSUE_TYPE_LABEL,
  ISSUE_TYPES,
  ITEM_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_TERM_LABEL,
  type IssueType,
  type OrderItemDTO,
} from '@havuz/core';
import { useConfirmDelivery, useOrder, useReportIssue } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/ui/icon';
import { OrderStatusBadge, PaymentBadge } from '@/components/ui/status';
import { Sheet } from '@/components/ui/sheet';
import { Field, Select } from '@/components/ui/input';
import { QtyStepper } from '@/components/app/qty-stepper';
import { PageSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty';
import { useCart } from '@/stores/cart';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useOrder(params.id);
  const receive = useConfirmDelivery(params.id);
  const [issueItem, setIssueItem] = useState<OrderItemDTO | null>(null);
  const addToCart = useCart((s) => s.add);

  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Sipariş bulunamadı'} onRetry={() => refetch()} />;
  const o = data.order;
  const bySupplier = o.items.reduce<Record<string, OrderItemDTO[]>>((acc, it) => {
    (acc[it.supplier.name] ??= []).push(it);
    return acc;
  }, {});
  const hasShipped = o.items.some((i) => i.status === 'shipped');
  const currentIdx = o.timeline.filter((t) => t.done).length - 1;

  return (
    <div className="space-y-6">
      <Link href="/uye/siparisler" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Siparişler
      </Link>
      <PageHeader
        eyebrow={o.wave ? o.wave.title : 'Hemen teslim'}
        title={<span className="font-mono">{o.number}</span>}
        description={`${fmtDateTime(o.createdAt)} · ${o.itemCount} kalem · ${o.supplierCount} tedarikçi`}
        action={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                o.items.filter((i) => i.status !== 'cancelled').forEach((i) => addToCart(i.offerId, i.qty));
                toast.success('Ürünler sepete eklendi');
                router.push('/uye/sepet');
              }}
            >
              <Repeat className="h-4 w-4" /> Tekrar sipariş ver
            </Button>
            {hasShipped && (
              <Button
                loading={receive.isPending}
                onClick={async () => {
                  try {
                    await receive.mutateAsync();
                    toast.success('Teslimat onaylandı', { description: 'Sorunlu ürün varsa kalem üzerinden bildirebilirsiniz.' });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Hata');
                  }
                }}
              >
                <PackageCheck className="h-4 w-4" /> Teslim aldım
              </Button>
            )}
          </>
        }
      />

      {/* Durum zaman çizelgesi */}
      <Card>
        <CardBody>
          {o.status === 'cancelled' ? (
            <div className="text-sm text-fg-muted">Bu sipariş iptal edildi.</div>
          ) : (
            <ol className="grid grid-cols-4 gap-2">
              {o.timeline.map((t, i) => (
                <li key={t.status} className="relative">
                  <div className="flex items-center">
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.12, type: 'spring', stiffness: 400, damping: 20 }}
                      className={cn(
                        'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold',
                        t.done ? 'bg-primary text-primary-fg' : 'bg-muted text-fg-subtle',
                        i === currentIdx && t.status !== 'delivered' && 'ring-4 ring-primary/20',
                      )}
                    >
                      {t.done ? <Check className="h-4 w-4" /> : i + 1}
                    </motion.span>
                    {i < o.timeline.length - 1 && (
                      <div className="mx-1 h-0.5 flex-1 overflow-hidden rounded bg-muted">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: o.timeline[i + 1].done ? '100%' : '0%' }}
                          transition={{ delay: 0.15 + i * 0.12, duration: 0.5 }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-[13px] font-medium">{ORDER_STATUS_LABEL[t.status]}</div>
                  <div className="text-xs text-fg-subtle">{t.at ? fmtDateTime(t.at) : '—'}</div>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {Object.entries(bySupplier).map(([name, items]) => (
            <Card key={name} className="overflow-hidden">
              <div className="border-b border-border bg-muted/40 px-5 py-3 text-sm font-semibold">{name}</div>
              <ul className="divide-y divide-border">
                {items.map((it) => (
                  <li key={it.id} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:flex-nowrap">
                    <CategoryIcon name={it.categoryIcon} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{it.productName}</div>
                      <div className="text-xs text-fg-muted">
                        {it.qty} {it.unit} × {formatTRY(it.finalUnitPrice)}
                        {it.finalUnitPrice < it.unitPrice && <span className="ml-1 text-success line-through decoration-fg-subtle/40">{formatTRY(it.unitPrice)}</span>}
                      </div>
                      {it.issue && (
                        <div className="mt-1.5">
                          <Badge tone={it.issue.status === 'open' ? 'warning' : it.issue.status === 'resolved' ? 'success' : 'neutral'}>
                            {ISSUE_TYPE_LABEL[it.issue.type]} · {ISSUE_STATUS_LABEL[it.issue.status]}
                            {it.issue.creditAmount > 0 && ` · +${formatTRY(it.issue.creditAmount)}`}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Badge tone={it.status === 'delivered' ? 'success' : it.status === 'shipped' ? 'primary' : it.status === 'cancelled' ? 'neutral' : 'warning'}>{ITEM_STATUS_LABEL[it.status]}</Badge>
                    <div className="w-24 text-right font-semibold tabular">{formatTRY(it.qty * it.finalUnitPrice)}</div>
                    {it.status === 'delivered' && !it.issue && (
                      <button onClick={() => setIssueItem(it)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-fg-muted hover:bg-warning-soft hover:text-warning">
                        <AlertTriangle className="h-3.5 w-3.5" /> Sorun bildir
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          {o.note && (
            <Card>
              <CardBody className="text-sm">
                <span className="font-medium">Not:</span> <span className="text-fg-muted">{o.note}</span>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Özet" action={<OrderStatusBadge status={o.status} />} />
            <CardBody className="space-y-2.5 text-sm">
              <Line l="Ara toplam" v={formatTRY(o.subtotal)} />
              <Line l="KDV" v={formatTRY(o.vat)} />
              {o.financingFee > 0 && <Line l="Vade farkı" v={formatTRY(o.financingFee)} />}
              {o.creditApplied > 0 && <Line l="Kullanılan kredi" v={`−${formatTRY(o.creditApplied)}`} />}
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <span>Toplam</span>
                <span className="tabular">{formatTRY(o.total)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-fg-muted">{PAYMENT_TERM_LABEL[o.paymentTerm]}</span>
                <PaymentBadge status={o.paymentStatus} />
              </div>
              {o.dueAt && <Line l="Vade tarihi" v={fmtDate(o.dueAt)} />}
            </CardBody>
          </Card>
          <Card className="border-success/25 bg-gradient-to-br from-success-soft to-surface">
            <CardBody className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-fg-muted">Piyasaya göre tasarruf</span>
                <span className="font-semibold text-success tabular">{formatTRY(o.savings)}</span>
              </div>
              {o.waveCredit > 0 && (
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-fg-muted">
                    <Gift className="h-4 w-4" /> Dalga kademe iadesi
                  </span>
                  <span className="font-semibold text-success tabular">+{formatTRY(o.waveCredit)}</span>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <IssueSheet orderId={o.id} item={issueItem} onClose={() => setIssueItem(null)} />
    </div>
  );
}

function Line({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-fg-muted">{l}</span>
      <span className="tabular">{v}</span>
    </div>
  );
}

function IssueSheet({ orderId, item, onClose }: { orderId: string; item: OrderItemDTO | null; onClose: () => void }) {
  const report = useReportIssue(orderId);
  const [type, setType] = useState<IssueType>('damaged');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title="Mal kabul sorunu bildir"
      footer={
        <Button
          size="lg"
          className="w-full"
          loading={report.isPending}
          onClick={async () => {
            if (!item) return;
            try {
              await report.mutateAsync({ itemId: item.id, input: { type, qty, note: [note, photo ? '[fotoğraf eklendi]' : ''].filter(Boolean).join(' ') || undefined } });
              toast.success('Bildiriminiz alındı', { description: 'Operasyon ekibi inceledikten sonra iade kredinize geçer.' });
              setNote('');
              setPhoto(null);
              onClose();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Gönderilemedi');
            }
          }}
        >
          Bildirimi gönder
        </Button>
      }
    >
      {item && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
            <CategoryIcon name={item.categoryIcon} />
            <div>
              <div className="font-medium">{item.productName}</div>
              <div className="text-xs text-fg-muted">
                {item.qty} {item.unit} · {item.supplier.name}
              </div>
            </div>
          </div>
          <Field label="Sorun türü">
            <Select value={type} onChange={(e) => setType(e.target.value as IssueType)}>
              {ISSUE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ISSUE_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Etkilenen miktar">
            <QtyStepper value={qty} onChange={setQty} min={1} max={item.qty} unit={item.unit} />
          </Field>
          <Field label="Açıklama">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={400}
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/15"
              placeholder="Örn. 2 koli ezik geldi"
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-sm text-fg-muted transition hover:border-primary/50 hover:text-fg">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Eklenen fotoğraf" className="h-14 w-14 rounded-xl object-cover" />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-xl bg-muted">
                <Camera className="h-5 w-5" />
              </span>
            )}
            <span>{photo ? 'Fotoğraf eklendi · değiştirmek için dokunun' : 'Fotoğraf ekle (kamera veya galeri)'}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPhoto(URL.createObjectURL(f));
              }}
            />
          </label>
          <p className="text-xs text-fg-subtle">Onaylanan bildirimlerde etkilenen miktarın KDV dahil bedeli kredi bakiyenize eklenir.</p>
        </div>
      )}
    </Sheet>
  );
}
