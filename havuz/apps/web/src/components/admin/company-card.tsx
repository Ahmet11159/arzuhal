'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, Building } from 'lucide-react';
import type { CompanyInput } from '@havuz/core';
import { ApiError, useCompany, useUpdateCompany } from '@havuz/sdk';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LEGAL_LINKS } from '@/components/site/site-footer';

const FIELDS: { key: keyof CompanyInput; label: string; hint?: string; wide?: boolean }[] = [
  { key: 'legalName', label: 'Ticari unvan', hint: 'Vergi levhasındaki tam unvan', wide: true },
  { key: 'brandName', label: 'Marka adı' },
  { key: 'phone', label: 'Telefon' },
  { key: 'email', label: 'Destek e-postası' },
  { key: 'kvkkEmail', label: 'KVKK başvuru e-postası', hint: 'Boşsa destek e-postası' },
  { key: 'address', label: 'Açık adres', wide: true },
  { key: 'taxOffice', label: 'Vergi dairesi' },
  { key: 'taxNo', label: 'Vergi no' },
  { key: 'mersisNo', label: 'MERSİS no' },
  { key: 'tradeRegistryNo', label: 'Ticaret sicil no' },
  { key: 'kepAddress', label: 'KEP adresi' },
  { key: 'etbisNo', label: 'ETBİS kayıt no' },
  { key: 'supportHours', label: 'Destek saatleri', hint: 'ör. Hafta içi 09:00–18:00' },
];

/** Yönetim: yasal sayfalarda ve iletişimde görünen şirket bilgileri. */
export function CompanyCard() {
  const { data, isLoading } = useCompany();
  const update = useUpdateCompany();
  const [v, setV] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    const placeholder = (s: string) => (s.startsWith('[') ? '' : s);
    setV(Object.fromEntries(FIELDS.map((f) => [f.key, placeholder(String(data[f.key as keyof typeof data] ?? ''))])));
  }, [data]);

  async function save() {
    try {
      await update.mutateAsync(v as unknown as CompanyInput);
      toast.success('Şirket bilgileri kaydedildi; yasal sayfalar güncellendi');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    }
  }

  return (
    <Card className="xl:col-span-2">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Building className="h-4 w-4" /> Şirket bilgileri ve yasal sayfalar
          </span>
        }
        description="Bu bilgiler KVKK aydınlatma metni, kullanım koşulları, satış sözleşmesi, hakkımızda ve iletişim sayfalarında kullanılır."
      />
      <CardBody className="space-y-4">
        {isLoading || !data ? (
          <Skeleton className="h-48" />
        ) : (
          <>
            {!data.configured && (
              <div className="flex gap-2 rounded-xl bg-warning-soft p-3 text-[13px] text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Şirket bilgileri henüz girilmedi: yasal sayfalarda yer tutucular görünüyor. Yayına almadan ve iyzico canlı başvurusundan önce doldurun.</span>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className={f.wide ? 'sm:col-span-2' : undefined}>
                  <Field label={f.label} hint={f.hint}>
                    <Input value={v[f.key] ?? ''} onChange={(e) => setV((p) => ({ ...p, [f.key]: e.target.value }))} />
                  </Field>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={save} loading={update.isPending}>
                Kaydet
              </Button>
              <span className="text-xs text-fg-subtle">
                Metinler hazır taslaktır; yayından önce hukuk danışmanınıza okutun. Sayfalar:{' '}
                {LEGAL_LINKS.map((l, i) => (
                  <span key={l.href}>
                    {i > 0 && ', '}
                    <Link href={l.href} target="_blank" className="underline underline-offset-2">
                      {l.label}
                    </Link>
                  </span>
                ))}
              </span>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
