'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, CreditCard, Info, ShoppingCart, Trash2, Truck, Waves, Zap } from 'lucide-react';
import {
  computeOrderTotals,
  FINANCING_BPS,
  formatPercent,
  formatTRY,
  isTermAllowed,
  pickActiveWave,
  PAYMENT_TERM_LABEL,
  PAYMENT_TERMS,
  type OfferDTO,
  type PaymentTerm,
  type ProductDTO,
} from '@havuz/core';
import { ApiError, useCreateOrder, useMe, useProducts, useWaves } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { CategoryIcon } from '@/components/ui/icon';
import { EmptyState } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { QtyStepper } from '@/components/app/qty-stepper';
import { offerUnitPrice } from '@/components/catalog/pricing';
import { useCart } from '@/stores/cart';
import { usePay } from '@/components/payment/use-pay';
import { cn } from '@/lib/cn';

interface Line {
  offer: OfferDTO;
  product: ProductDTO;
  qty: number;
  unitPrice: number;
}

export default function CartPage() {
  const router = useRouter();
  const { lines, mode, setMode, setQty, remove, clear } = useCart();
  const products = useProducts({});
  const me = useMe();
  const create = useCreateOrder();
  const [term, setTerm] = useState<PaymentTerm>('cash');
  const [accepted, setAccepted] = useState(false);
  const [note, setNote] = useState('');
  const [done, setDone] = useState<{ id: string; number: string; paying: boolean } | null>(null);
  const payment = usePay();

  const plan = me.data?.user.org.plan ?? 'free';
  const waves = useWaves();
  const activeWave = useMemo(
    () => (waves.data ? pickActiveWave(waves.data.waves) : null),
    [waves.data],
  );

  const resolved = useMemo(() => {
    const idx = new Map<string, { offer: OfferDTO; product: ProductDTO }>();
    for (const p of products.data?.products ?? []) for (const o of p.offers) idx.set(o.id, { offer: o, product: p });
    const out: Line[] = [];
    const missing: string[] = [];
    for (const [id, qty] of Object.entries(lines)) {
      const r = idx.get(id);
      if (!r) {
        missing.push(id);
        continue;
      }
      out.push({ ...r, qty, unitPrice: offerUnitPrice(r.offer, mode, qty) });
    }
    return { lines: out, missing };
  }, [products.data, lines, mode]);

  const bySupplier = useMemo(() => {
    const g = new Map<string, { name: string; lead: number; lines: Line[] }>();
    for (const l of resolved.lines) {
      const k = l.offer.supplier.id;
      const e = g.get(k) ?? { name: l.offer.supplier.name, lead: 0, lines: [] };
      e.lines.push(l);
      e.lead = Math.max(e.lead, l.offer.leadTimeDays);
      g.set(k, e);
    }
    return [...g.values()];
  }, [resolved.lines]);

  const totals = useMemo(() => {
    if (!resolved.lines.length || !isTermAllowed(plan, term)) return null;
    return computeOrderTotals(
      resolved.lines.map((l) => ({ qty: l.qty, unitPrice: l.unitPrice, marketPrice: l.product.marketPrice, vatRate: l.product.vatRate })),
      { plan, term },
    );
  }, [resolved.lines, plan, term]);

  async function placeOrder() {
    if (!resolved.lines.length) return;
    if (!accepted) {
      toast.error('Devam etmek için kullanım ve iptal-iade koşullarını onaylayın');
      return;
    }
    const wId = mode === 'wave' ? activeWave?.id ?? null : null;
    try {
      const r = await create.mutateAsync({
        items: resolved.lines.map((l) => ({ offerId: l.offer.id, qty: l.qty })),
        waveId: wId,
        paymentTerm: term,
        acceptTerms: true,
        note: note.trim() || undefined,
      });
      clear();
      if (r.order.paymentStatus === 'unpaid') {
        // Peşin sipariş: stok ayrıldı, kart ödemesine yönlendir (30 dk içinde ödenmezse iptal).
        setDone({ id: r.order.id, number: r.order.number, paying: true });
        await payment.pay({ purpose: 'order', orderId: r.order.id });
        if (!payment.pending) setTimeout(() => router.push(`/uye/siparisler/${r.order.id}`), 1200);
      } else {
        setDone({ id: r.order.id, number: r.order.number, paying: false });
        setTimeout(() => router.push(`/uye/siparisler/${r.order.id}`), 1800);
      }
    } catch (e) {
      toast.error('Sipariş oluşturulamadı', { description: e instanceof ApiError ? e.message : 'Lütfen tekrar deneyin' });
    }
  }

  if (done) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="relative mx-auto h-24 w-24">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/30" />
            <span className="relative grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-fg shadow-glow">
              <CheckCircle2 className="h-12 w-12" />
            </span>
          </motion.div>
          <h1 className="mt-6 text-2xl font-semibold">{done.paying ? 'Siparişiniz oluşturuldu' : 'Siparişiniz alındı'}</h1>
          <p className="mt-1 font-mono text-sm text-fg-muted">{done.number}</p>
          <p className="mt-3 text-sm text-fg-muted">{done.paying ? 'Güvenli ödeme sayfasına yönlendiriliyorsunuz…' : 'Sipariş detayına yönlendiriliyorsunuz…'}</p>
        </motion.div>
      </div>
    );
  }

  const empty = Object.keys(lines).length === 0;

  return (
    <div>
      <PageHeader
        title="Sepet"
        description="Tüm tedarikçiler tek siparişte, tek faturada."
        action={
          <Link href="/uye/katalog">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Alışverişe devam
            </Button>
          </Link>
        }
      />

      {empty ? (
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          title="Sepetiniz boş"
          description="Katalogdan ürün ekleyin; açık dalgaya katılarak havuz fiyatından yararlanın."
          action={
            <Link href="/uye/katalog">
              <Button>Kataloğa git</Button>
            </Link>
          }
        />
      ) : products.isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <Card>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">Teslimat şekli</div>
                  <div className="text-xs text-fg-muted">
                    {mode === 'wave' ? 'Havuz fiyatı, dalga kapanınca nihai kademe uygulanır; fark kredinize iade edilir.' : 'Taban fiyatla, tedarikçinin teslim süresinde gelir.'}
                  </div>
                </div>
                <Segmented
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'wave', label: <><Waves className="h-3.5 w-3.5" /> Dalga</> },
                    { value: 'direct', label: <><Zap className="h-3.5 w-3.5" /> Hemen</> },
                  ]}
                />
              </CardBody>
            </Card>

            {resolved.missing.length > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
                {resolved.missing.length} ürün artık mevcut değil.
                <button className="font-semibold underline" onClick={() => resolved.missing.forEach(remove)}>
                  Kaldır
                </button>
              </div>
            )}

            <AnimatePresence initial={false}>
              {bySupplier.map((g) => (
                <motion.div key={g.name} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                  <Card className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
                      <span className="text-sm font-semibold">{g.name}</span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                        <Truck className="h-3.5 w-3.5" /> {mode === 'wave' ? 'Dalga teslimatında' : `${g.lead} gün içinde`}
                      </span>
                    </div>
                    <ul className="divide-y divide-border">
                      <AnimatePresence initial={false}>
                        {g.lines.map((l) => (
                          <motion.li key={l.offer.id} layout exit={{ opacity: 0, x: -30 }} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:flex-nowrap">
                            <CategoryIcon name={l.product.category.icon} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{l.product.name}</div>
                              <div className="text-xs text-fg-muted">
                                {l.product.packLabel} · {formatTRY(l.unitPrice)} / {l.product.unit}
                                {mode === 'wave' && l.offer.wave && <span className="text-primary"> · havuzda {l.offer.wave.pooledQty + l.qty}</span>}
                              </div>
                            </div>
                            <QtyStepper value={l.qty} onChange={(v) => setQty(l.offer.id, v)} min={1} max={l.offer.stock} size="sm" />
                            <div className="w-24 text-right font-semibold tabular">{formatTRY(l.unitPrice * l.qty)}</div>
                            <button onClick={() => remove(l.offer.id)} className="grid h-8 w-8 place-items-center rounded-lg text-fg-subtle hover:bg-danger-soft hover:text-danger" aria-label={`${l.product.name} kaldır`}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="space-y-4 lg:sticky lg:top-6">
            <Card>
              <CardHeader title="Ödeme" />
              <CardBody className="space-y-3">
                {PAYMENT_TERMS.map((t) => {
                  const allowed = isTermAllowed(plan, t);
                  const bps = FINANCING_BPS[plan][t];
                  return (
                    <label
                      key={t}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition',
                        term === t ? 'border-primary bg-primary-soft/50' : 'border-border hover:border-fg-subtle/40',
                        !allowed && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <input type="radio" name="term" className="sr-only" checked={term === t} disabled={!allowed} onChange={() => setTerm(t)} />
                      <span className={cn('grid h-4 w-4 place-items-center rounded-full border-2', term === t ? 'border-primary' : 'border-border')}>
                        {term === t && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      <CreditCard className="h-4 w-4 text-fg-muted" />
                      <span className="flex-1 text-sm font-medium">{PAYMENT_TERM_LABEL[t]}</span>
                      <span className="text-xs text-fg-muted">{!allowed ? 'Pro' : bps ? `+${formatPercent(bps / 10_000)}` : 'Kartla'}</span>
                    </label>
                  );
                })}
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Teslimat notu (isteğe bağlı)"
                  className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/15"
                />
              </CardBody>
            </Card>

            {totals && (
              <Card>
                <CardBody className="space-y-2.5 text-sm">
                  <Row label="Ara toplam" value={formatTRY(totals.subtotal)} />
                  <Row label="KDV" value={formatTRY(totals.vat)} />
                  {totals.financingFee > 0 && <Row label="Vade farkı" value={formatTRY(totals.financingFee)} />}
                  <div className="flex items-baseline justify-between border-t border-border pt-3">
                    <span className="font-semibold">Toplam</span>
                    <motion.span key={totals.total} initial={{ scale: 1.08 }} animate={{ scale: 1 }} className="text-2xl font-semibold tracking-tight tabular">
                      {formatTRY(totals.total)}
                    </motion.span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-[13px] text-success">
                    <Info className="h-4 w-4 shrink-0" />
                    Piyasa fiyatına göre <b className="tabular">{formatTRY(totals.savings)}</b> tasarruf
                  </div>
                  <label className="mt-1 flex cursor-pointer items-start gap-2.5 rounded-xl border border-border p-3 text-[13px] leading-snug">
                    <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--primary))]" />
                    <span className="text-fg-muted">
                      <Link href="/kullanim-kosullari" target="_blank" className="font-medium text-fg underline underline-offset-2">Kullanım koşullarını</Link> ve{' '}
                      <Link href="/iptal-iade" target="_blank" className="font-medium text-fg underline underline-offset-2">iptal-iade koşullarını</Link> okudum, kabul ediyorum.
                    </span>
                  </label>
                  <Button size="lg" className="mt-2 w-full" onClick={placeOrder} loading={create.isPending || payment.pending} disabled={!resolved.lines.length}>
                    {term === 'cash' && totals.total > 0 ? 'Siparişi onayla ve öde' : mode === 'wave' && activeWave ? 'Dalgaya katıl ve sipariş ver' : 'Siparişi onayla'}
                  </Button>
                  <p className="text-center text-[11px] text-fg-subtle">
                    {term === 'cash' && totals.total > 0
                      ? 'Sonraki adımda kartla güvenli ödeme yapılır; ödeme 30 dakika içinde tamamlanmazsa sipariş iptal edilir.'
                      : 'Fiyatlar sunucuda yeniden doğrulanır. Dalgada nihai kademe kapanışta belirlenir.'}
                  </p>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-fg-muted">{label}</span>
      <span className={cn('tabular', tone === 'success' && 'font-medium text-success')}>{value}</span>
    </div>
  );
}
