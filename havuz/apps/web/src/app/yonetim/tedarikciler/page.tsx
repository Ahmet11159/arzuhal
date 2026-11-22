'use client';

import { useState } from 'react';
import { Pencil, Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrgFormSheet, type OrgFormValues } from '@/components/admin/org-form-sheet';
import { formatPercent, formatTRY, formatTRYWhole } from '@havuz/core';
import { useAdminSuppliers } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty';

export default function AdminSuppliers() {
  const { data, isLoading, error, refetch } = useAdminSuppliers();
  const [form, setForm] = useState<{ open: boolean; initial: OrgFormValues | null }>({ open: false, initial: null });
  return (
    <div>
      <PageHeader
        title="Tedarikçiler"
        description="Performans karnesi: hacim, komisyon, zamanında teslim, mal kabul sorunları ve bekleyen hakediş."
        action={
          <Button onClick={() => setForm({ open: true, initial: null })}>
            <Plus className="h-4 w-4" /> Yeni tedarikçi
          </Button>
        }
      />
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.suppliers.map((s) => (
            <Card
              key={s.id}
              className={`cursor-pointer p-5 transition hover:-translate-y-0.5 hover:shadow-lift ${s.active ? '' : 'opacity-60'}`}
              onClick={() =>
                setForm({
                  open: true,
                  initial: { id: s.id, name: s.name, city: s.city.split(', ').pop() ?? s.city, district: s.district, email: s.email, phone: s.phone, commissionBps: s.commissionBps, iban: s.iban, active: s.active },
                })
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-fg-muted">{s.city}</div>
                </div>
                <span className="inline-flex items-center gap-2">
                  {!s.active && <Badge tone="danger">Pasif</Badge>}
                  <span className="inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2 py-1 text-xs font-semibold text-warning">
                    <Star className="h-3 w-3 fill-current" /> {s.rating.toFixed(1)}
                  </span>
                  <Pencil className="h-3.5 w-3.5 text-fg-subtle" />
                </span>
              </div>
              <div className="mt-5 text-2xl font-semibold tracking-tight tabular">{formatTRYWhole(s.gmv90)}</div>
              <div className="text-xs text-fg-subtle">90 günlük hacim · komisyon {formatPercent(s.commissionBps / 10_000)} → {formatTRYWhole(Math.round((s.gmv90 * s.commissionBps) / 10_000))}</div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-xs">
                <span className="text-fg-muted">Bekleyen hakediş</span>
                <span className="font-semibold tabular">{formatTRY(s.pendingPayout)}</span>
              </div>
              {!s.iban && <div className="mt-2 text-xs text-warning">IBAN girilmemiş</div>}
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
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
      <OrgFormSheet type="supplier" open={form.open} initial={form.initial} onClose={() => setForm({ open: false, initial: null })} />
    </div>
  );
}
