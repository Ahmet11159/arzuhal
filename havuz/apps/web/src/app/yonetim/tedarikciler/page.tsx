'use client';

import { Star } from 'lucide-react';
import { formatPercent, formatTRYWhole } from '@havuz/core';
import { useAdminSuppliers } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty';

export default function AdminSuppliers() {
  const { data, isLoading, error, refetch } = useAdminSuppliers();
  return (
    <div>
      <PageHeader title="Tedarikçiler" description="Performans karnesi: hacim, komisyon, zamanında teslim ve mal kabul sorunları." />
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.suppliers.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-fg-muted">{s.city}</div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2 py-1 text-xs font-semibold text-warning">
                  <Star className="h-3 w-3 fill-current" /> {s.rating.toFixed(1)}
                </span>
              </div>
              <div className="mt-5 text-2xl font-semibold tracking-tight tabular">{formatTRYWhole(s.gmv90)}</div>
              <div className="text-xs text-fg-subtle">90 günlük hacim · komisyon {formatPercent(s.commissionBps / 10_000)} → {formatTRYWhole(Math.round((s.gmv90 * s.commissionBps) / 10_000))}</div>
              <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                <div>
                  <dt className="text-[11px] text-fg-subtle">Zamanında</dt>
                  <dd className="font-semibold tabular">{formatPercent(s.onTimeRate)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-fg-subtle">Teklif</dt>
                  <dd className="font-semibold tabular">{s.offerCount}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-fg-subtle">Sorun (90g)</dt>
                  <dd className={`font-semibold tabular ${s.issueCount > 5 ? 'text-danger' : ''}`}>{s.issueCount}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
