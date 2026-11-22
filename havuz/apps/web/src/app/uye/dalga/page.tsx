'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Gift, Plus, Users, Waves } from 'lucide-react';
import { formatTRY, formatTRYCompact, pickActiveWave, WAVE_STATUS_LABEL } from '@havuz/core';
import { useWave, useWaves } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { WaveBanner } from '@/components/app/wave-banner';
import { Card, CardHeader } from '@/components/ui/card';
import { CategoryIcon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { Segmented } from '@/components/ui/segmented';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/ui/empty';
import { PageSkeleton } from '@/components/ui/skeleton';
import { useCart } from '@/stores/cart';
import { fmtDate } from '@/lib/format';
import { toast } from 'sonner';

type Filter = 'near' | 'all' | 'unlocked';

export default function WavePage() {
  const waves = useWaves();
  const active = useMemo(() => (waves.data ? pickActiveWave(waves.data.waves) : null), [waves.data]);
  const detail = useWave(active?.id);
  const [filter, setFilter] = useState<Filter>('near');
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const setMode = useCart((s) => s.setMode);

  const offers = useMemo(() => {
    const all = detail.data?.wave.offers ?? [];
    if (filter === 'unlocked') return all.filter((o) => o.currentPrice < o.basePrice);
    if (filter === 'near') return all.filter((o) => o.next && o.pooledQty > 0).sort((a, b) => (b.next?.progress ?? 0) - (a.next?.progress ?? 0));
    return all;
  }, [detail.data, filter]);

  if (waves.isLoading) return <PageSkeleton />;
  if (waves.error) return <ErrorState message={waves.error.message} onRetry={() => waves.refetch()} />;
  const past = waves.data?.waves.filter((w) => w.status !== 'open').slice(0, 8) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Toplu sipariş dalgası" description="Herkesin siparişi tek havuzda birleşir. Her kademe aşıldığında birim fiyat tüm katılımcılar için düşer." />

      {active ? (
        <>
          <WaveBanner wave={active} cta={{ href: '/uye/katalog', label: 'Kataloğa git' }} />
          <Card className="overflow-hidden">
            <CardHeader
              title="Kademe ilerlemesi"
              description="Az bir hacimle bir sonraki fiyata ulaşacak ürünler. Eklediğiniz miktar havuza hemen yansır."
              action={
                <Segmented
                  size="sm"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'near', label: 'Kademeye yakın' },
                    { value: 'unlocked', label: 'İndirim açıldı' },
                    { value: 'all', label: 'Tümü' },
                  ]}
                />
              }
            />
            {detail.isLoading ? (
              <div className="p-5 text-sm text-fg-muted">Yükleniyor…</div>
            ) : offers.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={<Waves className="h-6 w-6" />} title="Bu filtrede ürün yok" description="Diğer sekmelere göz atın." />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {offers.slice(0, 40).map((o, i) => {
                  const inCart = lines[o.offerId] ?? 0;
                  const unlocked = o.currentPrice < o.basePrice;
                  return (
                    <motion.li
                      key={o.offerId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i, 15) * 0.025 }}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4"
                    >
                      <CategoryIcon name={o.categoryIcon} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{o.productName}</span>
                          {unlocked && (
                            <Badge tone="success">
                              <Check className="h-3 w-3" /> −{formatTRY(o.basePrice - o.currentPrice)}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-fg-muted">{o.supplierName}</div>
                        {o.next ? (
                          <div className="mt-2 max-w-md">
                            <Progress value={o.next.progress} label={`${o.productName} kademe ilerlemesi`} />
                            <div className="mt-1.5 flex justify-between text-[11.5px] text-fg-muted">
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3 w-3" /> {o.pooledQty} {o.unit} havuzda
                              </span>
                              <span>
                                <b className="text-fg">{o.next.remainingQty} {o.unit}</b> sonra {formatTRY(o.next.unitPrice)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1.5 text-xs font-medium text-primary">En iyi kademe açıldı · {o.pooledQty} {o.unit}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <div className="font-semibold tabular">{formatTRY(o.currentPrice)}</div>
                          <div className="text-[11px] text-fg-subtle">en iyi {formatTRY(o.bestPrice)}</div>
                        </div>
                        <button
                          onClick={() => {
                            setMode('wave');
                            add(o.offerId, o.next ? Math.min(o.next.remainingQty, 10) || 1 : 1);
                            toast.success(`${o.productName} sepete eklendi`, { action: { label: 'Sepet', onClick: () => (window.location.href = '/uye/sepet') } });
                          }}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary-soft px-2.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-fg active:scale-95"
                        >
                          <Plus className="h-3.5 w-3.5" /> {inCart ? `Sepette ${inCart}` : o.next ? `${Math.min(o.next.remainingQty, 10) || 1} ekle` : 'Ekle'}
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      ) : (
        <EmptyState
          icon={<Waves className="h-6 w-6" />}
          title="Şu an açık dalga yok"
          description="Yeni dalga açıldığında burada göreceksiniz. Bu arada hemen teslim siparişi verebilirsiniz."
          action={
            <Link href="/uye/katalog">
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Kataloğa git <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          }
        />
      )}

      <Card className="overflow-hidden">
        <CardHeader title="Geçmiş dalgalar" description="Kapanışta üyelere iade edilen kademe farkları" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40 text-left text-xs text-fg-muted">
                <th className="px-5 py-2 font-medium">Dalga</th>
                <th className="px-3 py-2 font-medium">Kapanış</th>
                <th className="px-3 py-2 text-right font-medium">İşletme</th>
                <th className="px-3 py-2 text-right font-medium">Hacim</th>
                <th className="px-5 py-2 text-right font-medium">İade edilen</th>
              </tr>
            </thead>
            <tbody>
              {past.map((w) => (
                <tr key={w.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-medium">{w.title}</div>
                    <div className="text-xs text-fg-subtle">{WAVE_STATUS_LABEL[w.status]}</div>
                  </td>
                  <td className="px-3 py-3 text-fg-muted">{fmtDate(w.cutoffAt)}</td>
                  <td className="px-3 py-3 text-right tabular">{w.memberCount}</td>
                  <td className="px-3 py-3 text-right tabular">{formatTRYCompact(w.volume)}</td>
                  <td className="px-5 py-3 text-right font-medium tabular text-success">
                    <span className="inline-flex items-center gap-1">
                      <Gift className="h-3.5 w-3.5" /> {formatTRY(w.totalCredit)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
