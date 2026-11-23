'use client';

import Link from 'next/link';
import { AlertTriangle, Banknote, ChevronRight, Clock, Landmark } from 'lucide-react';
import { formatIban, formatTRY, SETTLEMENT_STATUS_LABEL } from '@havuz/core';
import { useSupplierPayouts } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatTile } from '@/components/ui/stat';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty';
import { fmtDate } from '@/lib/format';

export default function SupplierPayoutsPage() {
  const { data, isLoading, error, refetch } = useSupplierPayouts();
  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Yüklenemedi'} onRetry={() => refetch()} />;
  const paid = data.settlements.filter((s) => s.status === 'paid').reduce((a, s) => a + s.netAmount, 0);
  const profileOk = data.profile.complete && (!data.marketplace || data.profile.registered);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hakedişler"
        description={
          data.marketplace
            ? 'Üye ödediği anda payınız ayrılır. Teslimden 48 saat sonra (sorun bildirimi yoksa) iyzico payınızı doğrudan hesabınıza aktarır; Havuz paranıza hiç dokunmaz. Hakediş belgesi bu ödemelerin ve komisyon faturasının dökümüdür.'
            : 'Teslim ettiğiniz her kalemin bedeli; Havuz komisyonu (ve KDV’si) ile onaylı mal kabul iadeleri düşülerek dönemlik hakedişle hesabınıza ödenir.'
        }
      />
      {!profileOk && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-5 py-4 text-sm text-warning">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {data.profile.error
              ? `iyzico kaydınız tamamlanamadı: ${data.profile.error}`
              : data.marketplace
                ? 'Sipariş alabilmek ve ödeme alabilmek için ödeme bilgilerinizi tamamlayın.'
                : 'Hakediş ödemesi alabilmek için ödeme bilgilerinizi tamamlayın.'}
          </span>
          <Link href="/tedarikci/ayarlar" className="font-semibold underline">
            Ayarlar
          </Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile index={0} tone="accent" label="Yoldaki ödemeler (tahmini)" value={data.awaiting.estimated} format={formatTRY} icon={<Clock className="h-4 w-4" />} hint={`${data.awaiting.itemCount} kalem: teslim, itiraz süresi veya üye ödemesi bekliyor`} />
        <StatTile index={1} tone="primary" label="Onaylandı, belgeye girecek" value={data.pending.netAmount} format={formatTRY} icon={<Banknote className="h-4 w-4" />} hint={`${data.pending.itemCount} kalem${data.marketplace ? ' · iyzico öder' : ''}`} />
        <StatTile index={2} label="Bugüne kadar ödenen" value={paid} format={formatTRY} icon={<Landmark className="h-4 w-4" />} hint={data.iban ? formatIban(data.iban) : 'IBAN girilmedi'} />
      </div>

      <Card>
        <CardHeader title="Sıradaki hakediş nasıl hesaplanıyor?" />
        <CardBody className="grid gap-3 sm:grid-cols-5">
          {[
            { l: 'KDV dahil satış (+ vade farkı)', v: formatTRY(data.pending.grossSales) },
            { l: 'Onaylı mal kabul iadeleri', v: `−${formatTRY(data.pending.issueDeductions)}` },
            { l: 'Komisyon (KDV hariç mal bedeli üzerinden)', v: `−${formatTRY(data.pending.commission)}` },
            { l: 'Komisyon KDV’si (%20)', v: `−${formatTRY(data.pending.commissionVat)}` },
            { l: 'Net payınız', v: formatTRY(data.pending.netAmount), strong: true },
          ].map((x) => (
            <div key={x.l} className={`rounded-2xl p-4 ${x.strong ? 'bg-primary-soft' : 'bg-muted/50'}`}>
              <div className="text-xs text-fg-muted">{x.l}</div>
              <div className={`mt-1 text-lg font-semibold tabular ${x.strong ? 'text-primary' : ''}`}>{x.v}</div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Hakediş geçmişi" />
        {data.settlements.length === 0 ? (
          <CardBody>
            <EmptyState icon={<Banknote className="h-6 w-6" />} title="Henüz hakediş yok" description="İlk teslimatlarınızdan sonra dönem sonunda hakediş oluşturulur." />
          </CardBody>
        ) : (
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {data.settlements.map((s) => (
              <li key={s.id}>
                <Link href={`/tedarikci/hakedis/${s.id}`} className="group flex flex-wrap items-center gap-4 px-5 py-3.5 transition hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm font-medium">{s.number}</div>
                    <div className="text-xs text-fg-muted">
                      Dönem sonu {fmtDate(s.periodEnd)} · {s.itemCount} kalem{s.paidAt ? ` · ödendi ${fmtDate(s.paidAt)}` : ''}
                    </div>
                  </div>
                  <Badge tone={s.status === 'paid' ? 'success' : 'warning'}>{s.channel === 'iyzico' ? 'iyzico öder' : SETTLEMENT_STATUS_LABEL[s.status]}</Badge>
                  <span className="w-32 text-right font-semibold tabular">{formatTRY(s.netAmount)}</span>
                  <ChevronRight className="h-4 w-4 text-fg-subtle transition group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
