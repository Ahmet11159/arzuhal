'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Gift, Lock, Plus, Waves } from 'lucide-react';
import { formatTRY, formatTRYCompact, fromTrInputValue, nextTrWeekday, trInputValue, WAVE_STATUS_LABEL } from '@havuz/core';
import { useCloseWave, useCreateWave, useWave, useWaves } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Countdown } from '@/components/ui/countdown';
import { CategoryIcon } from '@/components/ui/icon';
import { PageSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty';
import { fmtDate, fmtDateTime } from '@/lib/format';


export default function AdminWaves() {
  const { data, isLoading, error, refetch } = useWaves();
  const open = useMemo(() => data?.waves.filter((w) => w.status === 'open') ?? [], [data]);
  const [selected, setSelected] = useState<string | null>(null);
  const current = selected ?? open[0]?.id ?? null;
  const detail = useWave(current);
  const close = useCloseWave();
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  const w = detail.data?.wave;
  const unlocked = w?.offers.filter((o) => o.currentPrice < o.basePrice).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dalgalar"
        description="Toplu sipariş dalgalarını açın, izleyin ve kapatın. Kapanışta nihai kademeler uygulanır; farklar üyelere döner (ödenmiş siparişte karta iade, vadelide borçtan düşüm)."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Yeni dalga
          </Button>
        }
      />

      {w && w.status === 'open' && (
        <Card className="overflow-hidden">
          <CardBody className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone="primary">
                  <Waves className="h-3 w-3" /> Açık
                </Badge>
                <span className="text-xs text-fg-muted">Kapanış {fmtDateTime(w.cutoffAt)}</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold">{w.title}</h2>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-muted">
                <span>{w.memberCount} işletme</span>
                <span>{w.orderCount} sipariş</span>
                <span>{formatTRYCompact(w.volume)} hacim</span>
                <span>{unlocked} üründe indirim açıldı</span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <Countdown to={w.cutoffAt} compact />
              <Button variant="secondary" onClick={() => setConfirming(true)}>
                <Lock className="h-4 w-4" /> Dalgayı kapat
              </Button>
            </div>
          </CardBody>
          <div className="border-t border-border">
            <div className="grid max-h-[480px] gap-px overflow-y-auto bg-border sm:grid-cols-2">
              {w.offers
                .filter((o) => o.pooledQty > 0)
                .map((o) => (
                  <div key={o.offerId} className="flex items-center gap-3 bg-surface px-5 py-3.5">
                    <CategoryIcon name={o.categoryIcon} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{o.productName}</span>
                        <span className="shrink-0 tabular">{formatTRY(o.currentPrice)}</span>
                      </div>
                      <div className="mb-1.5 flex justify-between text-[11px] text-fg-subtle">
                        <span className="truncate">{o.supplierName}</span>
                        <span>
                          {o.pooledQty} {o.unit}
                          {o.next ? ` / ${o.next.minQty}` : ' · en iyi kademe'}
                        </span>
                      </div>
                      <Progress value={o.next ? o.next.progress : 1} className="h-1.5" label={`${o.productName} ilerleme`} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader title="Tüm dalgalar" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40 text-left text-xs text-fg-muted">
                <th className="px-5 py-2 font-medium">Dalga</th>
                <th className="px-3 py-2 font-medium">Durum</th>
                <th className="px-3 py-2 font-medium">Kapanış</th>
                <th className="px-3 py-2 text-right font-medium">İşletme</th>
                <th className="px-3 py-2 text-right font-medium">Sipariş</th>
                <th className="px-3 py-2 text-right font-medium">Hacim</th>
                <th className="px-5 py-2 text-right font-medium">Kademe iadesi</th>
              </tr>
            </thead>
            <tbody>
              {data?.waves.map((x) => (
                <tr key={x.id} className="cursor-pointer border-b border-border transition last:border-0 hover:bg-muted/40" onClick={() => x.status === 'open' && setSelected(x.id)}>
                  <td className="px-5 py-3 font-medium">{x.title}</td>
                  <td className="px-3 py-3">
                    <Badge tone={x.status === 'open' ? 'primary' : x.status === 'closed' ? 'info' : 'neutral'}>{WAVE_STATUS_LABEL[x.status]}</Badge>
                  </td>
                  <td className="px-3 py-3 text-fg-muted">{fmtDate(x.cutoffAt)}</td>
                  <td className="px-3 py-3 text-right tabular">{x.memberCount}</td>
                  <td className="px-3 py-3 text-right tabular">{x.orderCount}</td>
                  <td className="px-3 py-3 text-right tabular">{formatTRYCompact(x.volume)}</td>
                  <td className="px-5 py-3 text-right tabular text-success">
                    {x.totalCredit > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Gift className="h-3.5 w-3.5" /> {formatTRY(x.totalCredit)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <CreateWaveSheet open={creating} onClose={() => setCreating(false)} />
      <Sheet
        open={confirming && !!w}
        onClose={() => setConfirming(false)}
        title="Dalgayı kapat"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>
              Vazgeç
            </Button>
            <Button
              className="flex-1"
              loading={close.isPending}
              onClick={async () => {
                if (!w) return;
                try {
                  const r = await close.mutateAsync(w.id);
                  toast.success('Dalga kapatıldı', { description: `${r.members} üyeye toplam ${formatTRY(r.totalCredit)} kademe farkı döndü (karta iade veya borçtan düşüm).` });
                  setSelected(null);
                  setConfirming(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Kapatılamadı');
                }
              }}
            >
              <Lock className="h-4 w-4" /> Kapat ve farkları iade et
            </Button>
          </div>
        }
      >
        {w && (
          <div className="space-y-3 text-sm text-fg-muted">
            <p>
              <b className="text-fg">{w.title}</b> siparişe kapatılacak. Bu işlem geri alınamaz.
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Her ürün için havuzdaki toplam miktara göre nihai kademe belirlenir.</li>
              <li>Daha yüksek kademeden ödeyen üyelere fark kartlarına iade edilir veya vadeli borçlarından düşülür.</li>
              <li>Tedarikçiler nihai fiyatlarla sevkiyat listesini görür.</li>
            </ul>
            <p>
              {w.memberCount} işletme · {w.orderCount} sipariş · {formatTRYCompact(w.volume)} hacim
            </p>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function CreateWaveSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateWave();
  // Saatler Türkiye saatiyle girilir/gösterilir (yöneticinin bilgisayarı başka saat diliminde olsa da).
  const cutoffDefault = nextTrWeekday(4, 18);
  const deliveryDefault = new Date(cutoffDefault.getTime() + 40 * 3600_000);
  const [title, setTitle] = useState('Haftalık Dalga');
  const [region, setRegion] = useState('İstanbul');
  const [cutoff, setCutoff] = useState(trInputValue(cutoffDefault));
  const [delivery, setDelivery] = useState(trInputValue(deliveryDefault));
  const [err, setErr] = useState<string | null>(null);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Yeni dalga aç"
      footer={
        <Button
          size="lg"
          className="w-full"
          loading={create.isPending}
          onClick={async () => {
            try {
              const c = fromTrInputValue(cutoff);
              const d = fromTrInputValue(delivery);
              if (!c || !d) return setErr('Tarih ve saatleri eksiksiz girin');
              const r = await create.mutateAsync({ title, region, cutoffAt: c.toISOString(), deliveryAt: d.toISOString() });
              toast.success(`${r.wave.title} açıldı`);
              onClose();
            } catch (e) {
              setErr(e instanceof Error ? e.message : 'Oluşturulamadı');
            }
          }}
        >
          Dalgayı aç
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Başlık" hint="Dalga numarası otomatik eklenir">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Bölge">
          <Input value={region} onChange={(e) => setRegion(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sipariş kapanışı">
            <Input type="datetime-local" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
          </Field>
          <Field label="Teslimat">
            <Input type="datetime-local" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
          </Field>
        </div>
        {err && <p className="text-sm text-danger">{err}</p>}
      </div>
    </Sheet>
  );
}
