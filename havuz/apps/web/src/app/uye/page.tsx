'use client';

import Link from 'next/link';
import { ArrowRight, Crown, PiggyBank, ReceiptText, ShoppingBag, TrendingDown, Wallet } from 'lucide-react';
import { formatPercent, formatTRY, formatTRYWhole, trParts } from '@havuz/core';
import { useMemberDashboard } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { WaveBanner } from '@/components/app/wave-banner';
import { OrderRow } from '@/components/app/order-row';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat';
import { ColumnChart } from '@/components/charts/charts';
import { BarList } from '@/components/charts/bar-list';
import { CategoryIcon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty';
import { fmtLongDate } from '@/lib/format';

function greeting() {
  const h = trParts().hour;
  return h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
}

export default function MemberDashboard() {
  const { data, isLoading, error, refetch } = useMemberDashboard();
  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Yüklenemedi'} onRetry={() => refetch()} />;
  const k = data.kpis;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={fmtLongDate(new Date())}
        title={`${greeting()}, ${data.org.name}`}
        description="Bu ayki tedarik harcamanız, tasarrufunuz ve açık dalga tek bakışta."
        action={
          <Link href="/uye/katalog">
            <Button>
              <ShoppingBag className="h-4 w-4" /> Sipariş ver
            </Button>
          </Link>
        }
      />

      {data.openWave && <WaveBanner wave={data.openWave} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile index={0} label="Bu ay harcama" value={k.monthSpend} format={formatTRYWhole} icon={<ReceiptText className="h-4 w-4" />} hint="KDV hariç, iadeler düşülmüş" />
        <StatTile
          index={1}
          tone="primary"
          label="Bu ay tasarruf"
          value={k.monthSavings}
          format={formatTRYWhole}
          icon={<TrendingDown className="h-4 w-4" />}
          hint={<span>Piyasa fiyatına göre <b className="text-success">{formatPercent(k.savingRate)}</b> daha ucuz</span>}
        />
        <StatTile index={2} tone="accent" label="Size dönen" value={k.returnedTotal} format={formatTRY} icon={<PiggyBank className="h-4 w-4" />} hint="Dalga farkı ve iadeler: karta iade veya borçtan düşüm" />
        <StatTile
          index={3}
          label="Açık vadeli bakiye"
          value={k.outstanding}
          format={formatTRYWhole}
          icon={<Wallet className="h-4 w-4" />}
          hint={`Limit ${formatTRYWhole(data.org.creditLimit)} · ${formatPercent(data.org.creditLimit ? k.outstanding / data.org.creditLimit : 0)} kullanımda`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Aylık harcama ve tasarruf" description={`Toplam ömür boyu tasarrufunuz: ${formatTRYWhole(k.lifetimeSavings)}`} />
          <CardBody>
            <ColumnChart
              data={data.monthly}
              xKey="month"
              series={[
                { key: 'spend', label: 'Harcama', slot: 1 },
                { key: 'savings', label: 'Tasarruf', slot: 3 },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Kategori dağılımı" description="Son 90 gün" />
          <CardBody>
            <BarList items={data.byCategory.map((c) => ({ label: c.category, value: c.spend, icon: <CategoryIcon name={c.icon} size="sm" /> }))} format={formatTRYWhole} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Fiyat takibi"
            description="En çok aldığınız ürünlerde emsal işletmelerle karşılaştırma"
            action={data.org.plan === 'free' ? <Badge tone="accent">Pro önizleme</Badge> : undefined}
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/40 text-left text-xs text-fg-muted">
                  <th className="px-5 py-2 font-medium">Ürün</th>
                  <th className="px-3 py-2 text-right font-medium">Sizin fiyat</th>
                  <th className="px-3 py-2 text-right font-medium">Emsal medyan</th>
                  <th className="px-5 py-2 text-right font-medium">Piyasa</th>
                </tr>
              </thead>
              <tbody>
                {data.priceWatch.map((p) => {
                  const diff = p.peerMedian ? (p.yourPrice - p.peerMedian) / p.peerMedian : 0;
                  return (
                    <tr key={p.productName} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <div className="font-medium">{p.productName}</div>
                        <div className="text-xs text-fg-subtle">/ {p.unit}</div>
                      </td>
                      <td className="px-3 py-3 text-right tabular">
                        <div className="font-medium">{formatTRY(p.yourPrice)}</div>
                        {Math.abs(diff) > 0.005 && (
                          <div className={`text-xs ${diff > 0 ? 'text-danger' : 'text-success'}`}>
                            {diff > 0 ? '▲' : '▼'} {formatPercent(Math.abs(diff))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular text-fg-muted">{formatTRY(p.peerMedian)}</td>
                      <td className="px-5 py-3 text-right tabular text-fg-subtle line-through decoration-fg-subtle/50">{formatTRY(p.marketPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Son siparişler"
            description={`${k.activeOrders} aktif sipariş`}
            action={
              <Link href="/uye/siparisler" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Tümü <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="mt-3 divide-y divide-border border-t border-border">
            {data.recentOrders.map((o) => (
              <OrderRow key={o.id} o={o} href={`/uye/siparisler/${o.id}`} />
            ))}
          </div>
        </Card>
      </div>

      {data.org.plan === 'free' && (
        <Card className="relative overflow-hidden border-accent/30 bg-gradient-to-r from-accent-soft via-surface to-surface">
          <CardBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-fg">
                <Crown className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-semibold">Pro ile 60 gün vade ve daha düşük vade farkı</h3>
                <p className="mt-1 text-sm text-fg-muted">Emsal fiyat karşılaştırması, daha yüksek vadeli limit ve kategori analitiği. Aylık ₺1.490.</p>
              </div>
            </div>
            <Link href="/uye/hesap">
              <Button variant="accent">Pro’ya geç</Button>
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
