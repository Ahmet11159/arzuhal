'use client';

import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { formatIban, formatTRY, SETTLEMENT_STATUS_LABEL } from '@havuz/core';
import { useSettlement } from '@havuz/sdk';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty';
import { fmtDate } from '@/lib/format';

/** Hakediş dökümü: tedarikçi ve yönetim aynı belgeyi görür; yazdırılabilir. */
export function SettlementDetailView({ id, backHref }: { id: string; backHref: string }) {
  const { data, isLoading, error, refetch } = useSettlement(id);
  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Yüklenemedi'} onRetry={() => refetch()} />;
  const st = data.settlement;
  return (
    <div className="space-y-6">
      <style>{`@media print { aside, header, nav, .no-print { display: none !important } main { padding: 0 !important } body { background: #fff } }`}</style>
      <div className="no-print flex items-center justify-between">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> Hakedişler
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Yazdır / PDF
        </Button>
      </div>
      <Card>
        <CardBody className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">Havuz · Hakediş dökümü</div>
              <h1 className="mt-1 font-mono text-2xl font-semibold">{st.number}</h1>
              <div className="mt-1 text-sm text-fg-muted">
                {st.supplier.name} · dönem sonu {fmtDate(st.periodEnd)}
              </div>
            </div>
            <div className="text-right">
              <Badge tone={st.status === 'paid' ? 'success' : 'warning'}>{st.channel === 'iyzico' ? 'iyzico tarafından ödenir' : SETTLEMENT_STATUS_LABEL[st.status]}</Badge>
              <div className="mt-2 text-3xl font-semibold tracking-tight tabular">{formatTRY(st.netAmount)}</div>
              {st.channel === 'iyzico' ? (
                <div className="text-xs text-fg-muted">Pazaryeri: tedarikçi payı her kalem onaylandığında iyzico’ca aktarılır</div>
              ) : (
                st.paidAt && <div className="text-xs text-fg-muted">Ödeme {fmtDate(st.paidAt)} · ref {st.reference}</div>
              )}
              {st.iban && <div className="mt-1 font-mono text-xs text-fg-subtle">{formatIban(st.iban)}</div>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            {[
              { l: 'KDV dahil satış (+ vade farkı)', v: formatTRY(st.grossSales) },
              { l: 'Mal kabul iadeleri', v: `−${formatTRY(st.issueDeductions)}` },
              { l: 'Havuz komisyonu', v: `−${formatTRY(st.commission)}` },
              { l: 'Komisyon KDV’si', v: `−${formatTRY(st.commissionVat)}` },
              { l: 'Net hakediş', v: formatTRY(st.netAmount), strong: true },
            ].map((x) => (
              <div key={x.l} className={`rounded-2xl p-4 ${x.strong ? 'bg-primary-soft' : 'bg-muted/50'}`}>
                <div className="text-xs text-fg-muted">{x.l}</div>
                <div className={`mt-1 text-lg font-semibold tabular ${x.strong ? 'text-primary' : ''}`}>{x.v}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-muted">
                  <th className="py-2 pr-3 font-medium">Teslim</th>
                  <th className="px-3 py-2 font-medium">Sipariş</th>
                  <th className="px-3 py-2 font-medium">İşletme</th>
                  <th className="px-3 py-2 font-medium">Ürün</th>
                  <th className="px-3 py-2 text-right font-medium">Miktar</th>
                  <th className="px-3 py-2 text-right font-medium">KDV dahil</th>
                  <th className="px-3 py-2 text-right font-medium">İade</th>
                  <th className="px-3 py-2 text-right font-medium">Komisyon + KDV</th>
                  <th className="py-2 pl-3 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {st.items.map((i) => (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-3 text-fg-muted">{i.deliveredAt ? fmtDate(i.deliveredAt) : '—'}</td>
                    <td className="px-3 py-1.5 font-mono text-xs">{i.orderNumber}</td>
                    <td className="px-3 py-1.5">{i.member}</td>
                    <td className="px-3 py-1.5">{i.productName}</td>
                    <td className="px-3 py-1.5 text-right tabular">
                      {i.qty} {i.unit}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular">{formatTRY(i.gross)}</td>
                    <td className="px-3 py-1.5 text-right tabular text-danger">{i.issueDeduction ? `−${formatTRY(i.issueDeduction)}` : '—'}</td>
                    <td className="px-3 py-1.5 text-right tabular text-fg-muted">−{formatTRY(i.commission + i.commissionVat)}</td>
                    <td className="py-1.5 pl-3 text-right font-medium tabular">{formatTRY(i.payout)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {st.issues.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold">Mal kabul iadeleri (üyeye iade edildi, kalem tutarından düşüldü)</div>
              <ul className="space-y-1 text-sm">
                {st.issues.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>
                      <span className="font-mono text-xs">{i.orderNumber}</span> · {i.productName}
                    </span>
                    <span className="tabular text-danger">−{formatTRY(i.creditAmount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
