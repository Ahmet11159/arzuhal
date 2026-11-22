'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrgFormSheet, type OrgFormValues } from '@/components/admin/org-form-sheet';
import { BUSINESS_TYPE_LABEL, formatPercent, formatTRY, formatTRYWhole, PLAN_LABEL } from '@havuz/core';
import { useAdminMembers } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty';
import { fmtRelative } from '@/lib/format';

export default function AdminMembers() {
  const { data, isLoading, error, refetch } = useAdminMembers();
  const [q, setQ] = useState('');
  const [form, setForm] = useState<{ open: boolean; initial: OrgFormValues | null }>({ open: false, initial: null });
  const list = useMemo(() => (data?.members ?? []).filter((m) => `${m.name} ${m.district}`.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR'))), [data, q]);

  return (
    <div>
      <PageHeader
        title="Üye işletmeler"
        description="Hacim, vadeli risk ve son aktivite. Satıra tıklayarak plan, limit ve durumu düzenleyin."
        action={
          <>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İşletme ara" icon={<Search className="h-4 w-4" />} className="w-56" />
            <Button onClick={() => setForm({ open: true, initial: null })}>
              <Plus className="h-4 w-4" /> Yeni işletme
            </Button>
          </>
        }
      />
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-fg-muted">
                  <th className="px-5 py-2.5 font-medium">İşletme</th>
                  <th className="px-3 py-2.5 font-medium">Plan</th>
                  <th className="px-3 py-2.5 text-right font-medium">Hacim (90 gün)</th>
                  <th className="px-3 py-2.5 text-right font-medium">Sipariş</th>
                  <th className="px-3 py-2.5 font-medium">Vadeli risk</th>
                  <th className="px-5 py-2.5 font-medium">Son sipariş</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => {
                  const use = m.creditLimit ? m.outstanding / m.creditLimit : 0;
                  return (
                    <tr
                      key={m.id}
                      className={`cursor-pointer border-b border-border last:border-0 hover:bg-muted/30 ${m.active ? '' : 'opacity-50'}`}
                      onClick={() =>
                        setForm({
                          open: true,
                          initial: { id: m.id, name: m.name, city: m.city, district: m.district, taxNo: m.taxNo, email: m.email, phone: m.phone, plan: m.plan, creditLimit: m.creditLimit, active: m.active },
                        })
                      }
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-fg-subtle">
                          {m.businessType ? BUSINESS_TYPE_LABEL[m.businessType] : '—'} · {m.district}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={m.plan === 'pro' ? 'accent' : 'neutral'}>{PLAN_LABEL[m.plan]}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular">{formatTRYWhole(m.gmv90)}</td>
                      <td className="px-3 py-3 text-right tabular text-fg-muted">{m.orderCount}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div className={`h-full rounded-full ${use > 0.8 ? 'bg-danger' : use > 0.5 ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${Math.min(100, use * 100)}%` }} />
                          </div>
                          <span className="text-xs tabular text-fg-muted">
                            {formatTRY(m.outstanding)} · {formatPercent(use)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-fg-muted">
                        <span className="inline-flex items-center gap-2">
                          {m.active ? (m.lastOrderAt ? fmtRelative(m.lastOrderAt) : '—') : <Badge tone="danger">Pasif</Badge>}
                          <Pencil className="h-3.5 w-3.5 text-fg-subtle" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <OrgFormSheet type="member" open={form.open} initial={form.initial} onClose={() => setForm({ open: false, initial: null })} />
    </div>
  );
}
