'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Banknote, Check, ChevronRight, FilePlus2 } from 'lucide-react';
import { formatIban, formatTRY, SETTLEMENT_STATUS_LABEL, trInputValue, type SettlementDTO } from '@havuz/core';
import { ApiError, useAdminPayouts, useCreateSettlements, useMarkSettlementPaid } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Segmented } from '@/components/ui/segmented';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty';
import { fmtDate } from '@/lib/format';

/** Türkiye saatine göre "YYYY-AA-GG". */
const isoDay = (d: Date) => trInputValue(d).slice(0, 10);

export default function AdminPayoutsPage() {
  const { data, isLoading, error, refetch } = useAdminPayouts();
  const create = useCreateSettlements();
  const [periodEnd, setPeriodEnd] = useState(isoDay(new Date(Date.now() - 86_400_000)));
  const [tab, setTab] = useState<'pending' | 'paid'>('pending');
  const [paying, setPaying] = useState<SettlementDTO | null>(null);

  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Yüklenemedi'} onRetry={() => refetch()} />;
  const totalPending = data.pending.reduce((a, r) => a + r.netAmount, 0);
  const rows = data.settlements.filter((s) => s.status === tab);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hakedişler"
        description="Teslim + 48 saat itiraz süresi dolan kalemler onaylanır (pazaryerinde iyzico ürün onayı) ve tedarikçi payı serbest kalır. Dönem sonunda bu kalemler hakediş belgesine (komisyon faturasının dayanağı) dönüşür. iyzico kanalındaki hakedişleri iyzico öder; havale kanalındakiler ödenince referansla işaretlenir."
      />
      <Card>
        <CardHeader title="Onaylanmış, belgeye girmeyi bekleyen kalemler" description={`Toplam tedarikçi payı ${formatTRY(totalPending)} · tedarikçi bazında`} />
        <CardBody className="space-y-5">
          {data.pending.length === 0 ? (
            <p className="text-sm text-fg-muted">Bekleyen teslimat yok.</p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border">
              {data.pending.map((r) => (
                <li key={r.supplier.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{r.supplier.name}</div>
                    <div className="font-mono text-xs text-fg-muted">{r.supplier.iban ? formatIban(r.supplier.iban) : <span className="font-sans text-warning">IBAN eksik</span>}</div>
                  </div>
                  <span className="text-xs text-fg-muted">{r.itemCount} kalem · komisyon {formatTRY(r.commission)}</span>
                  <span className="w-32 text-right font-semibold tabular">{formatTRY(r.netAmount)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Dönem sonu (bu tarihe kadar onaylananlar)">
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} max={isoDay(new Date())} />
            </Field>
            <Button
              loading={create.isPending}
              disabled={data.pending.length === 0}
              onClick={async () => {
                try {
                  // Gün sonu Türkiye saatine göre sunucuda hesaplanır.
                  const r = await create.mutateAsync({ periodEnd });
                  toast.success(r.created.length ? `${r.created.length} hakediş oluşturuldu` : 'Bu döneme ait yeni teslimat yok');
                } catch (e) {
                  toast.error(e instanceof ApiError ? e.message : 'Oluşturulamadı');
                }
              }}
            >
              <FilePlus2 className="h-4 w-4" /> Hakedişleri oluştur
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="Hakedişler"
          action={
            <Segmented
              size="sm"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'pending', label: 'Havale bekleyen' },
                { value: 'paid', label: 'Ödenen / iyzico' },
              ]}
            />
          }
        />
        {rows.length === 0 ? (
          <CardBody>
            <EmptyState icon={<Banknote className="h-6 w-6" />} title={tab === 'pending' ? 'Ödeme bekleyen hakediş yok' : 'Kayıt yok'} />
          </CardBody>
        ) : (
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <Link href={`/yonetim/hakedis/${s.id}`} className="group min-w-0 flex-1">
                  <div className="text-sm font-medium group-hover:text-primary">
                    {s.supplier.name} <span className="font-mono text-xs text-fg-muted">· {s.number}</span>
                  </div>
                  <div className="text-xs text-fg-muted">
                    Dönem sonu {fmtDate(s.periodEnd)} · {s.itemCount} kalem{s.reference ? ` · ref ${s.reference}` : ''}
                  </div>
                </Link>
                <Badge tone={s.status === 'paid' ? 'success' : 'warning'}>{s.channel === 'iyzico' ? 'iyzico öder' : SETTLEMENT_STATUS_LABEL[s.status]}</Badge>
                <span className="w-32 text-right font-semibold tabular">{formatTRY(s.netAmount)}</span>
                {s.status === 'pending' && s.channel === 'manual' ? (
                  <Button size="sm" onClick={() => setPaying(s)}>
                    <Check className="h-3.5 w-3.5" /> Ödendi
                  </Button>
                ) : (
                  <Link href={`/yonetim/hakedis/${s.id}`}>
                    <ChevronRight className="h-4 w-4 text-fg-subtle" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <PaySheet settlement={paying} onClose={() => setPaying(null)} />
    </div>
  );
}

function PaySheet({ settlement, onClose }: { settlement: SettlementDTO | null; onClose: () => void }) {
  const mark = useMarkSettlementPaid();
  const [reference, setReference] = useState('');
  return (
    <Sheet
      open={!!settlement}
      onClose={onClose}
      title="Hakediş ödendi"
      footer={
        <Button
          size="lg"
          className="w-full"
          loading={mark.isPending}
          onClick={async () => {
            try {
              await mark.mutateAsync({ id: settlement!.id, input: { reference } });
              toast.success('Ödendi olarak işaretlendi; tedarikçiye bildirim gitti');
              setReference('');
              onClose();
            } catch (e) {
              toast.error(e instanceof ApiError ? e.message : 'Kaydedilemedi');
            }
          }}
        >
          Ödendi olarak işaretle
        </Button>
      }
    >
      {settlement && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-muted/50 p-4 text-sm">
            <div className="font-medium">{settlement.supplier.name}</div>
            <div className="mt-1 text-2xl font-semibold tabular">{formatTRY(settlement.netAmount)}</div>
            <div className="mt-1 font-mono text-xs text-fg-muted">{settlement.iban ? formatIban(settlement.iban) : 'IBAN kayıtlı değil'}</div>
          </div>
          <Field label="Havale / EFT referansı">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Banka dekont numarası" />
          </Field>
          <p className="text-xs text-fg-muted">Önce bankadan ödemeyi yapın, sonra dekont numarasıyla burada işaretleyin. İşaretleme geri alınamaz ve işlem kaydına yazılır.</p>
        </div>
      )}
    </Sheet>
  );
}
