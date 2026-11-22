'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Inbox, Mail, Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrgFormSheet, type OrgFormValues } from '@/components/admin/org-form-sheet';
import { BUSINESS_TYPE_LABEL, formatTRYWhole, LEAD_STATUS_LABEL } from '@havuz/core';
import { useAdminLeads, useRejectLead } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtRelative } from '@/lib/format';

export default function AdminLeads() {
  const { data, isLoading, error, refetch } = useAdminLeads();
  const reject = useRejectLead();
  const [form, setForm] = useState<{ type: 'member' | 'supplier'; initial: OrgFormValues } | null>(null);
  return (
    <div>
      <PageHeader title="Başvurular" description="Açılış sayfasından gelen başvurular. Onaylayınca hesap açılır ve giriş bilgileri başvuru sahibine e-postayla gider." />
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
                <span className="flex gap-1.5">
                  <Badge tone={l.kind === 'member' ? 'primary' : 'accent'}>{l.kind === 'member' ? 'İşletme' : 'Tedarikçi'}</Badge>
                  <Badge tone={l.status === 'new' ? 'info' : l.status === 'approved' ? 'success' : 'neutral'}>{LEAD_STATUS_LABEL[l.status]}</Badge>
                </span>
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
              {l.status === 'new' && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      setForm({
                        type: l.kind,
                        initial: { name: l.businessName, businessType: l.businessType, city: l.city, email: l.email, phone: l.phone, owner: { name: l.contactName, email: l.email, phone: l.phone }, leadId: l.id },
                      })
                    }
                  >
                    <Check className="h-3.5 w-3.5" /> Onayla, hesap aç
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={reject.isPending && reject.variables === l.id}
                    onClick={async () => {
                      try {
                        await reject.mutateAsync(l.id);
                        toast.success('Başvuru reddedildi');
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Hata');
                      }
                    }}
                  >
                    <X className="h-3.5 w-3.5" /> Reddet
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {form && <OrgFormSheet type={form.type} open initial={form.initial} onClose={() => setForm(null)} />}
    </div>
  );
}
