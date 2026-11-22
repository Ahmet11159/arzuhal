'use client';

import Link from 'next/link';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { formatTRY, PAYMENT_TERM_LABEL, toLira, type StatementDTO } from '@havuz/core';
import { useStatement } from '@havuz/sdk';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty';
import { fmtDate } from '@/lib/format';
import { FileText } from 'lucide-react';

/** Muhasebe yazılımına aktarım için noktalı virgül ayraçlı, UTF-8 BOM'lu CSV (Excel Türkçe uyumlu). */
function toCsv(st: StatementDTO) {
  const num = (k: number) => toLira(k).toFixed(2).replace('.', ',');
  const rows = [['Sipariş', 'Tarih', 'Ödeme', 'Ürün', 'Tedarikçi', 'Miktar', 'Birim', 'Birim fiyat', 'KDV %', 'Tutar (KDV hariç)', 'KDV']];
  for (const o of st.orders)
    for (const l of o.lines)
      rows.push([o.number, fmtDate(o.date), PAYMENT_TERM_LABEL[o.paymentTerm], l.productName, l.supplier, String(l.qty), l.unit, num(l.unitPrice), String(l.vatRate), num(l.net), num(l.vat)]);
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
}

export default function StatementPage({ params }: { params: { ay: string } }) {
  const { data, isLoading, error, refetch } = useStatement(params.ay);
  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Yüklenemedi'} onRetry={() => refetch()} />;
  const st = data.statement;

  return (
    <div className="space-y-6 print:space-y-4">
      <style>{`@media print { aside, header, nav, .no-print { display: none !important } main { padding: 0 !important } body { background: #fff } }`}</style>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/uye/hesap" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" /> Hesap
        </Link>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const blob = new Blob([toCsv(st)], { type: 'text/csv;charset=utf-8' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `havuz-hesap-ozeti-${st.month}.csv`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            <Download className="h-4 w-4" /> CSV indir
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Yazdır / PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">Havuz · Aylık hesap özeti</div>
              <h1 className="mt-1 text-2xl font-semibold capitalize">{st.label}</h1>
            </div>
            <div className="text-right text-sm">
              <div className="font-semibold">{st.org.name}</div>
              <div className="text-fg-muted">
                {st.org.district ? `${st.org.district}, ` : ''}
                {st.org.city}
              </div>
              {st.org.taxNo && <div className="text-fg-muted">VKN {st.org.taxNo}</div>}
            </div>
          </div>

          {st.orders.length === 0 ? (
            <EmptyState icon={<FileText className="h-6 w-6" />} title="Bu ay sipariş yok" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-fg-muted">
                      <th className="py-2 pr-3 font-medium">Sipariş / ürün</th>
                      <th className="px-3 py-2 font-medium">Tedarikçi</th>
                      <th className="px-3 py-2 text-right font-medium">Miktar</th>
                      <th className="px-3 py-2 text-right font-medium">Birim fiyat</th>
                      <th className="px-3 py-2 text-right font-medium">KDV</th>
                      <th className="py-2 pl-3 text-right font-medium">Tutar</th>
                    </tr>
                  </thead>
                  {st.orders.map((o) => (
                    <tbody key={o.number} className="border-b border-border">
                      <tr className="bg-muted/40">
                        <td colSpan={6} className="px-2 py-2 text-xs">
                          <span className="font-mono font-semibold">{o.number}</span> · {fmtDate(o.date)} · {PAYMENT_TERM_LABEL[o.paymentTerm]} · toplam <b>{formatTRY(o.total)}</b>
                          {o.creditApplied > 0 && ` (kredi −${formatTRY(o.creditApplied)})`}
                          {o.financingFee > 0 && ` (vade farkı ${formatTRY(o.financingFee)})`}
                        </td>
                      </tr>
                      {o.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="py-1.5 pr-3">{l.productName}</td>
                          <td className="px-3 py-1.5 text-fg-muted">{l.supplier}</td>
                          <td className="px-3 py-1.5 text-right tabular">
                            {l.qty} {l.unit}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular">{formatTRY(l.unitPrice)}</td>
                          <td className="px-3 py-1.5 text-right tabular text-fg-muted">%{l.vatRate}</td>
                          <td className="py-1.5 pl-3 text-right tabular">{formatTRY(l.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm font-semibold">KDV dağılımı</div>
                  <table className="w-full text-sm">
                    <tbody>
                      {st.vatByRate.map((v) => (
                        <tr key={v.rate} className="border-b border-border last:border-0">
                          <td className="py-1.5">%{v.rate} matrah</td>
                          <td className="py-1.5 text-right tabular">{formatTRY(v.base)}</td>
                          <td className="py-1.5 pl-4 text-right tabular text-fg-muted">KDV {formatTRY(v.vat)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-1.5 text-sm">
                  <Row l="Ara toplam (KDV hariç)" v={formatTRY(st.totals.subtotal)} />
                  <Row l="KDV" v={formatTRY(st.totals.vat)} />
                  {st.totals.financingFee > 0 && <Row l="Vade farkı" v={formatTRY(st.totals.financingFee)} />}
                  {st.totals.creditApplied > 0 && <Row l="Kullanılan kredi" v={`−${formatTRY(st.totals.creditApplied)}`} />}
                  <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                    <span>Ödenecek / ödenen toplam</span>
                    <span className="tabular">{formatTRY(st.totals.total)}</span>
                  </div>
                  {st.totals.waveCredits > 0 && (
                    <div className="flex justify-between pt-1 text-success">
                      <span>Bu ay kazanılan dalga iadesi</span>
                      <span className="tabular">+{formatTRY(st.totals.waveCredits)}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          <p className="border-t border-border pt-4 text-xs text-fg-subtle">
            Bu belge bilgilendirme amaçlı hesap özetidir. Yasal e-Fatura, e-Fatura entegratörü üzerinden ayrıca düzenlenir. Tutarlar sipariş anındaki fiyatlardır; dalga kademe iadeleri kredi olarak ayrıca yansıtılır.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-fg-muted">{l}</span>
      <span className="tabular">{v}</span>
    </div>
  );
}
