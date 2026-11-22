'use client';

import { Inbox, Mail, Phone } from 'lucide-react';
import { BUSINESS_TYPE_LABEL, formatTRYWhole } from '@havuz/core';
import { useAdminLeads } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtRelative } from '@/lib/format';

export default function AdminLeads() {
  const { data, isLoading, error, refetch } = useAdminLeads();
  return (
    <div>
      <PageHeader title="Başvurular" description="Açılış sayfasından gelen işletme ve tedarikçi başvuruları." />
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-80" />
      ) : !data?.leads.length ? (
        <EmptyState icon={<Inbox className="h-6 w-6" />} title="Henüz başvuru yok" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.leads.map((l) => (
            <Card key={l.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{l.businessName}</div>
                  <div className="text-xs text-fg-muted">
                    {BUSINESS_TYPE_LABEL[l.businessType]} · {l.city}
                  </div>
                </div>
                <Badge tone={l.kind === 'member' ? 'primary' : 'accent'}>{l.kind === 'member' ? 'İşletme' : 'Tedarikçi'}</Badge>
              </div>
              <div className="mt-4 space-y-1.5 text-sm">
                <div className="font-medium">{l.contactName}</div>
                <a href={`tel:${l.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-fg-muted hover:text-primary">
                  <Phone className="h-3.5 w-3.5" /> {l.phone}
                </a>
                <a href={`mailto:${l.email}`} className="flex items-center gap-2 text-fg-muted hover:text-primary">
                  <Mail className="h-3.5 w-3.5" /> {l.email}
                </a>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-fg-subtle">
                <span>{l.monthlySpend ? `Aylık harcama ${formatTRYWhole(l.monthlySpend)}` : 'Harcama belirtilmedi'}</span>
                <span>{fmtRelative(l.createdAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
