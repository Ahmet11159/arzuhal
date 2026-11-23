'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Banknote, Inbox, Store, TrendingDown, TrendingUp, Truck } from 'lucide-react';
import { formatPercent, formatTRY, formatTRYWhole } from '@havuz/core';
import { useAdminOverview } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { WaveBanner } from '@/components/app/wave-banner';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat';
import { ColumnChart, TrendChart } from '@/components/charts/charts';
import { BarList } from '@/components/charts/bar-list';
import { PageSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty';
import { AnimatedNumber } from '@/components/ui/animated-number';

export default function AdminOverview() {
  const { data, isLoading, error, refetch } = useAdminOverview();
  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Yüklenemedi'} onRetry={() => refetch()} />;
  const k = data.kpis;
  const r = data.revenue;
  const revParts = [
    { key: 'commission', label: 'Tedarikçi komisyonu', value: r.commission },
    { key: 'subscriptions', label: 'Pro üyelik', value: r.subscriptions },
    { key: 'financing', label: 'Finansman (net vade farkı)', value: r.financing },
    { key: 'sponsored', label: 'Sponsorlu ürün', value: r.sponsored },
  ].filter((x) => x.key !== 'financing' || x.value > 0); // pazaryerinde vade farkı tedarikçiye gider

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Yönetim" title="Genel bakış" description="Ağın işlem hacmi, platform geliri ve operasyon durumu. Son 30 gün." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          index={0}
          tone="primary"
          label="İşlem hacmi (30 gün)"
          value={k.gmvMonth}
          format={formatTRYWhole}
          icon={<Banknote className="h-4 w-4" />}
          hint={
            <span className={k.gmvGrowth >= 0 ? 'text-success' : 'text-danger'}>
              {k.gmvGrowth >= 0 ? <TrendingUp className="mr-1 inline h-3 w-3" /> : <TrendingDown className="mr-1 inline h-3 w-3" />}
              önceki 30 güne göre {formatPercent(Math.abs(k.gmvGrowth))}
            </span>
          }
        />
        <StatTile index={1} tone="accent" label="Platform geliri (30 gün)" value={k.revenueMonth} format={formatTRYWhole} icon={<TrendingUp className="h-4 w-4" />} hint={`Hacmin ${formatPercent(k.gmvMonth ? k.revenueMonth / k.gmvMonth : 0)}’i`} />
        <StatTile index={2} label="Aktif üye" value={k.activeMembers} format={(n) => `${n} / ${k.totalMembers}`} icon={<Store className="h-4 w-4" />} hint={`${k.suppliers} tedarikçi`} />
        <StatTile index={3} label="Üyelere sağlanan tasarruf" value={k.memberSavingsMonth} format={formatTRYWhole} icon={<TrendingDown className="h-4 w-4" />} hint="Piyasa referansına göre" />
      </div>

      {data.openWave && <WaveBanner wave={data.openWave} cta={{ href: '/yonetim/dalgalar', label: 'Dalgayı yönet' }} />}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Aylık işlem hacmi" description="Ağ üzerinden geçen toplam satın alma (KDV hariç) · son ay devam ediyor" />
          <CardBody>
            <TrendChart data={data.monthly} xKey="month" series={[{ key: 'gmv', label: 'İşlem hacmi', slot: 'brand' }]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Gelir kırılımı" description="Son 30 gün · sistem sahibinin kazancı" />
          <CardBody>
            <div className="text-3xl font-semibold tracking-tight tabular">
              <AnimatedNumber value={r.total} format={formatTRY} />
            </div>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label="Gelir kalemlerinin payı">
              {revParts.map((p, i) => (
                <div key={p.key} className="h-full border-r-2 border-surface last:border-0" style={{ width: `${(p.value / (r.total || 1)) * 100}%`, background: `var(--chart-${i + 1})` }} title={`${p.label}: ${formatTRY(p.value)}`} />
              ))}
            </div>
            <ul className="mt-5 space-y-3 text-sm">
              {revParts.map((p, i) => (
                <li key={p.key} className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-fg-muted">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: `var(--chart-${i + 1})` }} />
                    {p.label}
                  </span>
                  <span className="tabular">
                    <b>{formatTRY(p.value)}</b> <span className="text-fg-subtle">· {formatPercent(p.value / (r.total || 1))}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Aylık platform geliri" />
          <CardBody>
            <ColumnChart data={data.monthly} xKey="month" series={[{ key: 'revenue', label: 'Gelir', slot: 'brand' }]} height={200} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Kategoriye göre hacim" description="Son 30 gün" />
          <CardBody>
            <BarList items={data.byCategory.map((c) => ({ label: c.category, value: c.gmv }))} format={formatTRYWhole} />
          </CardBody>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="En büyük üyeler" description="Son 30 gün" />
          <ul className="mt-3 divide-y divide-border border-t border-border">
            {data.topMembers.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-muted text-xs text-fg-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.name}</div>
                  <div className="text-xs text-fg-subtle">{m.district}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular">{formatTRYWhole(m.gmv)}</div>
                  <div className="text-xs text-success tabular">−{formatTRYWhole(m.savings)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickLink href="/yonetim/sorunlar" icon={<AlertTriangle className="h-5 w-5" />} label="Açık mal kabul bildirimi" value={k.openIssues} tone="warning" />
        <QuickLink href="/yonetim/basvurular" icon={<Inbox className="h-5 w-5" />} label="Son 14 gün başvuru" value={k.newLeads} tone="info" />
        <QuickLink href="/yonetim/tedarikciler" icon={<Truck className="h-5 w-5" />} label="Tedarikçi" value={k.suppliers} tone="primary" />
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label, value, tone }: { href: string; icon: React.ReactNode; label: string; value: number; tone: 'warning' | 'info' | 'primary' }) {
  const t = { warning: 'bg-warning-soft text-warning', info: 'bg-info-soft text-info', primary: 'bg-primary-soft text-primary' }[tone];
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
      <span className={`grid h-11 w-11 place-items-center rounded-xl ${t}`}>{icon}</span>
      <div className="flex-1">
        <div className="text-2xl font-semibold tabular">{value}</div>
        <div className="text-xs text-fg-muted">{label}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-fg-subtle transition group-hover:translate-x-0.5" />
    </Link>
  );
}
