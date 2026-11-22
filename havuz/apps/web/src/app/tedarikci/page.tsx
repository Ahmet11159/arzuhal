'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, ClipboardCheck, PackageOpen, Star, Truck, Users, Wallet } from 'lucide-react';
import { formatNumber, formatPercent, formatTRY, formatTRYWhole } from '@havuz/core';
import { useSupplierDashboard } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat';
import { TrendChart } from '@/components/charts/charts';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty';

export default function SupplierDashboard() {
  const { data, isLoading, error, refetch } = useSupplierDashboard();
  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Yüklenemedi'} onRetry={() => refetch()} />;
  const k = data.kpis;
  const maxF = Math.max(1, ...data.forecast.map((f) => f.projectedQty));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tedarikçi paneli"
        title={data.supplier.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-current text-accent" /> {data.supplier.rating.toFixed(1)}
            </span>
            <span>{formatPercent(data.supplier.onTimeRate)} zamanında teslim</span>
            <span>Komisyon {formatPercent(data.supplier.commissionBps / 10_000)}</span>
          </span>
        }
        action={
          <Link href="/tedarikci/siparisler">
            <Button>
              <ClipboardCheck className="h-4 w-4" /> Siparişleri işle
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile index={0} tone="primary" label="Son 30 gün ciro" value={k.monthRevenue} format={formatTRYWhole} icon={<Wallet className="h-4 w-4" />} hint="KDV hariç, Havuz üzerinden" />
        <StatTile index={1} tone="accent" label="Onay bekleyen kalem" value={k.pendingItems} format={(n) => String(n)} icon={<PackageOpen className="h-4 w-4" />} hint="Hızlı onay, puanınızı yükseltir" />
        <StatTile index={2} label="Sevke hazır" value={k.toShipItems} format={(n) => String(n)} icon={<Truck className="h-4 w-4" />} />
        <StatTile
          index={3}
          label="Aktif müşteri"
          value={k.activeMembers}
          format={(n) => String(n)}
          icon={<Users className="h-4 w-4" />}
          hint={
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> İade oranı {formatPercent(k.issueRate)}
            </span>
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Aylık ciro" description="Havuz üzerinden gerçekleşen satışlar" />
          <CardBody>
            <TrendChart data={data.monthly} xKey="month" series={[{ key: 'revenue', label: 'Ciro', slot: 'brand' }]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Açık dalga talep tahmini" description="Toplanan hacim ve kapanışa kadar projeksiyon" />
          <CardBody className="space-y-4">
            {data.forecast.length === 0 ? (
              <p className="text-sm text-fg-muted">Açık dalgada henüz ürünlerinize sipariş yok.</p>
            ) : (
              data.forecast.map((f) => (
                <div key={f.productName}>
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="font-medium">{f.productName}</span>
                    <span className="tabular text-fg-muted">
                      {formatNumber(f.pooledQty)} → <b className="text-fg">~{formatNumber(f.projectedQty)}</b> {f.unit}
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={f.projectedQty / maxF} tone="accent" className="h-2.5 opacity-40" />
                    <div className="absolute inset-0">
                      <Progress value={f.pooledQty / maxF} className="h-2.5 bg-transparent" />
                    </div>
                  </div>
                </div>
              ))
            )}
            <p className="pt-1 text-xs text-fg-subtle">Koyu çubuk: toplanan · açık çubuk: kapanış tahmini (geçen süreye göre doğrusal).</p>
          </CardBody>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="En çok satan ürünler"
          description="Son 30 gün"
          action={
            <Link href="/tedarikci/teklifler" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Teklifleri yönet <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40 text-left text-xs text-fg-muted">
                <th className="px-5 py-2 font-medium">Ürün</th>
                <th className="px-3 py-2 text-right font-medium">Miktar</th>
                <th className="px-5 py-2 text-right font-medium">Ciro</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((p, i) => (
                <tr key={p.productName} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">
                    <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded bg-muted text-[11px] text-fg-muted">{i + 1}</span>
                    {p.productName}
                  </td>
                  <td className="px-3 py-3 text-right tabular text-fg-muted">{formatNumber(p.qty)}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular">{formatTRY(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Badge tone="info" className="px-3 py-1.5 text-xs">
        Ödemeleriniz Havuz tarafından garanti edilir; teslimattan sonraki 2 iş günü içinde hesabınıza aktarılır.
      </Badge>
    </div>
  );
}
