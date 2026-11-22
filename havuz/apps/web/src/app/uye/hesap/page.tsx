'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Building2, Check, Crown, FileText, Gift, MapPin, MinusCircle, PiggyBank, Receipt, Wallet } from 'lucide-react';
import {
  BUSINESS_TYPE_LABEL,
  formatPercent,
  formatTRY,
  LEDGER_TYPE_LABEL,
  PLAN_LABEL,
  PRO_MONTHLY_FEE,
} from '@havuz/core';
import { useAccount, usePayOrder, useUpgrade } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaymentBadge } from '@/components/ui/status';
import { PageSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty';
import { Progress } from '@/components/ui/progress';
import { fmtDate } from '@/lib/format';

export default function AccountPage() {
  const { data, isLoading, error, refetch } = useAccount();
  const pay = usePayOrder();
  const upgrade = useUpgrade();
  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Yüklenemedi'} onRetry={() => refetch()} />;
  const usage = data.org.creditLimit ? data.outstanding / data.org.creditLimit : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Hesap" description="Kredi bakiyeniz, vadeli ödemeleriniz, aylık konsolide faturanız ve üyeliğiniz." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardBody>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-lg font-semibold text-primary-fg">{data.org.name[0]}</span>
              <div>
                <div className="font-semibold">{data.org.name}</div>
                <div className="text-xs text-fg-muted">{data.org.businessType ? BUSINESS_TYPE_LABEL[data.org.businessType] : 'İşletme'}</div>
              </div>
            </div>
            <dl className="mt-5 space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-fg-muted">
                <MapPin className="h-4 w-4" /> {data.org.district}, {data.org.city}
              </div>
              <div className="flex items-center gap-2 text-fg-muted">
                <Building2 className="h-4 w-4" /> VKN {data.org.taxNo ?? '—'}
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card className="relative overflow-hidden">
          <CardBody>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-fg-muted">Kredi bakiyesi</span>
              <PiggyBank className="h-5 w-5 text-warning" />
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight tabular">{formatTRY(data.creditBalance)}</div>
            <p className="mt-2 text-xs text-fg-muted">Dalga kademe iadeleri ve onaylanan mal kabul bildirimleri. Sepette tek tıkla kullanılır.</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-fg-muted">Vadeli limit kullanımı</span>
              <Wallet className="h-5 w-5 text-info" />
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight tabular">{formatTRY(data.outstanding)}</div>
            <Progress value={usage} className="mt-3" label="Limit kullanımı" />
            <p className="mt-2 text-xs text-fg-muted">
              {formatTRY(data.org.creditLimit)} limitin {formatPercent(usage)}’i kullanımda
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader title="Vadesi bekleyen ödemeler" description="Zamanında ödeme, limitinizin artmasını sağlar" />
            {data.dueOrders.length === 0 ? (
              <CardBody className="text-sm text-fg-muted">Açık bakiyeniz yok.</CardBody>
            ) : (
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {data.dueOrders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <Link href={`/uye/siparisler/${o.id}`} className="font-mono text-[13px] font-medium hover:text-primary">
                        {o.number}
                      </Link>
                      <div className="text-xs text-fg-muted">Vade {o.dueAt ? fmtDate(o.dueAt) : '—'}</div>
                    </div>
                    <PaymentBadge status={o.paymentStatus} />
                    <span className="w-28 text-right font-semibold tabular">{formatTRY(o.total)}</span>
                    <Button
                      size="sm"
                      variant={o.paymentStatus === 'overdue' ? 'danger' : 'secondary'}
                      loading={pay.isPending && pay.variables === o.id}
                      onClick={async () => {
                        try {
                          await pay.mutateAsync(o.id);
                          toast.success(`${o.number} ödendi`);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Ödeme başarısız');
                        }
                      }}
                    >
                      Öde
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Aylık konsolide fatura" description="Tüm tedarikçilerden alımlarınız tek e-faturada" />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-y border-border bg-muted/40 text-left text-xs text-fg-muted">
                    <th className="px-5 py-2 font-medium">Dönem</th>
                    <th className="px-3 py-2 text-right font-medium">Sipariş</th>
                    <th className="px-3 py-2 text-right font-medium">KDV</th>
                    <th className="px-5 py-2 text-right font-medium">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv, i) => (
                    <tr key={inv.month} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <FileText className="h-4 w-4 text-fg-subtle" /> {inv.month}
                          {i === 0 && <Badge tone="info">Açık dönem</Badge>}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular text-fg-muted">{inv.orderCount}</td>
                      <td className="px-3 py-3 text-right tabular text-fg-muted">{formatTRY(inv.vat)}</td>
                      <td className="px-5 py-3 text-right font-semibold tabular">{formatTRY(inv.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className={data.org.plan === 'pro' ? 'border-accent/40' : ''}>
            <CardBody>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-warning" />
                  <span className="font-semibold">Üyelik</span>
                </div>
                <Badge tone={data.org.plan === 'pro' ? 'accent' : 'neutral'}>{PLAN_LABEL[data.org.plan]}</Badge>
              </div>
              {data.org.plan === 'pro' ? (
                <p className="mt-3 text-sm text-fg-muted">Pro avantajları aktif: 60 gün vade, %0,9 vade farkı, emsal fiyat karşılaştırması.</p>
              ) : (
                <>
                  <ul className="mt-4 space-y-2 text-sm">
                    {['60 gün vade seçeneği', '30 günde %1,5 yerine %0,9 vade farkı', 'Vadeli limit en az ₺250.000', 'Emsal işletme fiyat karşılaştırması'].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="accent"
                    className="mt-5 w-full"
                    loading={upgrade.isPending}
                    onClick={async () => {
                      try {
                        await upgrade.mutateAsync();
                        toast.success('Pro üyeliğiniz aktif', { description: 'Yeni vade seçenekleri sepette kullanılabilir.' });
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Hata');
                      }
                    }}
                  >
                    Pro’ya geç · {formatTRY(PRO_MONTHLY_FEE)}/ay
                  </Button>
                </>
              )}
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Kredi hareketleri" />
            <ul className="mt-3 max-h-[440px] divide-y divide-border overflow-y-auto border-t border-border">
              {data.ledger.map((e, i) => (
                <motion.li key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="flex items-center gap-3 px-5 py-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${e.amount >= 0 ? 'bg-success-soft text-success' : 'bg-muted text-fg-muted'}`}>
                    {e.type === 'wave_rebate' ? <Gift className="h-4 w-4" /> : e.type === 'issue_credit' ? <Receipt className="h-4 w-4" /> : <MinusCircle className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{e.description}</div>
                    <div className="text-xs text-fg-subtle">
                      {LEDGER_TYPE_LABEL[e.type]} · {fmtDate(e.createdAt)}
                    </div>
                  </div>
                  <span className={`text-sm font-semibold tabular ${e.amount >= 0 ? 'text-success' : 'text-fg-muted'}`}>
                    {e.amount >= 0 ? '+' : '−'}
                    {formatTRY(Math.abs(e.amount))}
                  </span>
                </motion.li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
