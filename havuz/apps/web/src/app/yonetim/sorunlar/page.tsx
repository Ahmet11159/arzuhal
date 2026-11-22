'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, X } from 'lucide-react';
import { formatTRY, ISSUE_STATUS_LABEL, ISSUE_TYPE_LABEL } from '@havuz/core';
import { useAdminIssues, useResolveIssue } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState, ErrorState } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtDate } from '@/lib/format';
import { Sheet } from '@/components/ui/sheet';

export default function AdminIssues() {
  const { data, isLoading, error, refetch } = useAdminIssues();
  const resolve = useResolveIssue();
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const [preview, setPreview] = useState<string | null>(null);
  const list = useMemo(() => (data?.issues ?? []).filter((i) => (tab === 'open' ? i.status === 'open' : i.status !== 'open')), [data, tab]);

  async function act(id: string, status: 'resolved' | 'rejected') {
    try {
      await resolve.mutateAsync({ id, input: { status } });
      toast.success(status === 'resolved' ? 'Onaylandı, üyeye kredi yazıldı' : 'Bildirim reddedildi');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hata');
    }
  }

  return (
    <div>
      <PageHeader
        title="Mal kabul bildirimleri"
        description="Üyelerin eksik, hasarlı veya kalitesiz ürün bildirimleri. Onaylananlar KDV dahil bedeliyle krediye dönüşür."
        action={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'open', label: 'Açık' },
              { value: 'closed', label: 'Sonuçlanan' },
            ]}
          />
        }
      />
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-80" />
      ) : list.length === 0 ? (
        <EmptyState icon={<AlertTriangle className="h-6 w-6" />} title={tab === 'open' ? 'Açık bildirim yok' : 'Kayıt yok'} />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {list.map((i) => {
            const credit = Math.round(i.qty * i.unitPrice * (1 + i.vatRate / 100));
            return (
              <div key={i.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                {i.photo ? (
                  <button onClick={() => setPreview(i.photo)} className="shrink-0 overflow-hidden rounded-xl ring-1 ring-border transition hover:ring-primary" aria-label="Fotoğrafı büyüt">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.photo} alt={`${i.productName} bildirim fotoğrafı`} className="h-12 w-12 object-cover" />
                  </button>
                ) : (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{i.productName}</span>
                    <Badge tone="warning">{ISSUE_TYPE_LABEL[i.type]}</Badge>
                    {i.status !== 'open' && <Badge tone={i.status === 'resolved' ? 'success' : 'neutral'}>{ISSUE_STATUS_LABEL[i.status]}</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-fg-muted">
                    {i.member} → {i.supplier} · <span className="font-mono">{i.orderNumber}</span> · {fmtDate(i.createdAt)} · {i.qty} adet
                  </div>
                  {i.note && <div className="mt-1 text-sm text-fg-muted">“{i.note}”</div>}
                </div>
                {i.status === 'open' ? (
                  <div className="flex items-center gap-2">
                    <span className="mr-2 text-xs text-fg-muted">≈ {formatTRY(credit)}</span>
                    <Button size="sm" variant="ghost" disabled={resolve.isPending} onClick={() => act(i.id, 'rejected')}>
                      <X className="h-3.5 w-3.5" /> Reddet
                    </Button>
                    <Button size="sm" disabled={resolve.isPending} onClick={() => act(i.id, 'resolved')}>
                      <Check className="h-3.5 w-3.5" /> Onayla
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm font-semibold tabular text-success">{i.creditAmount > 0 ? `+${formatTRY(i.creditAmount)}` : '—'}</span>
                )}
              </div>
            );
          })}
        </Card>
      )}
      <Sheet open={!!preview} onClose={() => setPreview(null)} title="Bildirim fotoğrafı">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview && <img src={preview} alt="Bildirim fotoğrafı" className="w-full rounded-2xl" />}
      </Sheet>
    </div>
  );
}
