'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, CreditCard, RotateCcw, Undo2 } from 'lucide-react';
import {
  formatTRY,
  PAYMENT_PURPOSE_LABEL,
  REFUND_REASON_LABEL,
  REFUND_STATUS_LABEL,
  type RefundDTO,
} from '@havuz/core';
import { ApiError, useAdminRefunds, usePayments, useRefundAction } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Sheet } from '@/components/ui/sheet';
import { Field, Input } from '@/components/ui/input';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty';
import { StatTile } from '@/components/ui/stat';
import { fmtDateTime } from '@/lib/format';

const PAYMENT_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  succeeded: { label: 'Başarılı', tone: 'success' },
  pending: { label: 'Bekliyor', tone: 'warning' },
  failed: { label: 'Başarısız', tone: 'danger' },
  cancelled: { label: 'Vazgeçildi', tone: 'neutral' },
};

/** Yönetim: kart ödemeleri ve karta iadeler; sorunlu iadeler için yeniden deneme / elle tamamlama. */
export default function AdminPaymentsPage() {
  const payments = usePayments();
  const refunds = useAdminRefunds();
  const [tab, setTab] = useState<'refunds' | 'payments'>('refunds');
  const [review, setReview] = useState<RefundDTO | null>(null);

  if (payments.isLoading || refunds.isLoading) return <PageSkeleton />;
  if (payments.error || refunds.error || !payments.data || !refunds.data)
    return <ErrorState message={(payments.error ?? refunds.error)?.message ?? 'Yüklenemedi'} onRetry={() => (payments.refetch(), refunds.refetch())} />;

  const rf = refunds.data;
  const needs = rf.filter((r) => r.status === 'needs_review' || r.status === 'failed');
  const inFlight = rf.filter((r) => r.status === 'pending' || r.status === 'processing');
  const done = rf.filter((r) => r.status === 'succeeded');
  const pays = payments.data.payments;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ödemeler ve iadeler"
        description="Kart ödemeleri ve karta iadeler. İadeler önce kayda yazılır, sonra sağlayıcıya gönderilir; başarısız olanlar artan aralıklarla yeniden denenir, sonucu belirsiz olanlar burada kontrol bekler."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile index={0} tone={needs.length ? 'accent' : 'primary'} label="Kontrol bekleyen iade" value={needs.length} format={(n) => String(n)} icon={<AlertTriangle className="h-4 w-4" />} hint={formatTRY(needs.reduce((a, r) => a + r.amount, 0))} />
        <StatTile index={1} label="Sıradaki iadeler" value={inFlight.length} format={(n) => String(n)} icon={<RotateCcw className="h-4 w-4" />} hint={formatTRY(inFlight.reduce((a, r) => a + r.amount, 0))} />
        <StatTile index={2} label="Tamamlanan iade" value={done.length} format={(n) => String(n)} icon={<Undo2 className="h-4 w-4" />} hint={formatTRY(done.reduce((a, r) => a + r.amount, 0))} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title={tab === 'refunds' ? 'Karta iadeler' : 'Kart ödemeleri'}
          action={
            <Segmented
              size="sm"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'refunds', label: `İadeler${needs.length ? ` (${needs.length})` : ''}` },
                { value: 'payments', label: 'Ödemeler' },
              ]}
            />
          }
        />
        {tab === 'refunds' ? (
          rf.length === 0 ? (
            <CardBody>
              <EmptyState icon={<Undo2 className="h-6 w-6" />} title="Henüz iade yok" />
            </CardBody>
          ) : (
            <ul className="mt-4 divide-y divide-border border-t border-border">
              {[...needs, ...inFlight, ...done].map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {r.orgName}
                      {r.orderId && (
                        <Link href={`/uye/siparisler/${r.orderId}`} className="ml-2 font-mono text-xs text-fg-muted hover:text-primary">
                          {r.orderNumber}
                        </Link>
                      )}
                    </div>
                    <div className="text-xs text-fg-subtle">
                      {REFUND_REASON_LABEL[r.reason]} · {fmtDateTime(r.createdAt)}
                      {r.attempts > 1 ? ` · ${r.attempts} deneme` : ''}
                    </div>
                    {r.error && <div className="mt-0.5 text-xs text-danger">{r.error}</div>}
                  </div>
                  <Badge tone={r.status === 'succeeded' ? 'success' : r.status === 'needs_review' || r.status === 'failed' ? 'danger' : 'warning'}>{REFUND_STATUS_LABEL[r.status]}</Badge>
                  <span className="w-28 text-right font-semibold tabular">{formatTRY(r.amount)}</span>
                  {(r.status === 'needs_review' || r.status === 'failed') && (
                    <Button size="sm" variant="secondary" onClick={() => setReview(r)}>
                      İncele
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : pays.length === 0 ? (
          <CardBody>
            <EmptyState icon={<CreditCard className="h-6 w-6" />} title="Henüz ödeme yok" />
          </CardBody>
        ) : (
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {pays.slice(0, 200).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {p.orgName} <span className="font-mono text-xs text-fg-muted">{p.orderNumber ?? ''}</span>
                  </div>
                  <div className="text-xs text-fg-subtle">
                    {PAYMENT_PURPOSE_LABEL[p.purpose]} · {p.provider} · {fmtDateTime(p.createdAt)}
                    {p.cardLast4 ? ` · •••• ${p.cardLast4}` : ''}
                  </div>
                  {p.errorMessage && <div className="mt-0.5 text-xs text-danger">{p.errorMessage}</div>}
                </div>
                <Badge tone={PAYMENT_STATUS[p.status].tone}>{PAYMENT_STATUS[p.status].label}</Badge>
                <span className="w-28 text-right tabular">
                  <span className="font-semibold">{formatTRY(p.amount)}</span>
                  {p.refundedAmount > 0 && <span className="block text-[11px] text-success">−{formatTRY(p.refundedAmount)} iade</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <ReviewSheet refund={review} onClose={() => setReview(null)} />
    </div>
  );
}

function ReviewSheet({ refund, onClose }: { refund: RefundDTO | null; onClose: () => void }) {
  const action = useRefundAction();
  const [note, setNote] = useState('');
  async function run(input: { action: 'retry' } | { action: 'mark_done'; note: string }) {
    try {
      await action.mutateAsync({ id: refund!.id, input });
      toast.success(input.action === 'retry' ? 'İade yeniden denenecek' : 'İade tamamlandı olarak işaretlendi');
      setNote('');
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'İşlem yapılamadı');
    }
  }
  return (
    <Sheet open={!!refund} onClose={onClose} title="İadeyi incele">
      {refund && (
        <div className="space-y-4 text-sm">
          <div className="rounded-xl bg-muted/50 p-3">
            <div className="font-medium">
              {refund.orgName} · {formatTRY(refund.amount)}
            </div>
            <div className="text-xs text-fg-muted">{refund.description}</div>
            {refund.error && <div className="mt-1 text-xs text-danger">{refund.error}</div>}
          </div>
          <p className="text-fg-muted">
            Önce iyzico panelinde (İşlemler → İadeler) bu iadenin yapılıp yapılmadığını kontrol edin. Yapılmadıysa yeniden deneyin; elle yaptıysanız
            referansıyla tamamlandı olarak işaretleyin. Aynı iadeyi iki kez yapmamak için bu sıra önemlidir.
          </p>
          <Button className="w-full" variant="secondary" loading={action.isPending} onClick={() => run({ action: 'retry' })}>
            <RotateCcw className="h-4 w-4" /> iyzico’ya yeniden gönder
          </Button>
          <Field label="Elle yapıldıysa: kontrol notu / iyzico referansı">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ör. panelden iade edildi, ref 12345" />
          </Field>
          <Button className="w-full" loading={action.isPending} disabled={note.trim().length < 3} onClick={() => run({ action: 'mark_done', note })}>
            Tamamlandı olarak işaretle
          </Button>
        </div>
      )}
    </Sheet>
  );
}
