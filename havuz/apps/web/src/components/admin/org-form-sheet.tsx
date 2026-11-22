'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  BUSINESS_TYPE_LABEL,
  BUSINESS_TYPES,
  formatIban,
  toKurus,
  toLira,
  type BusinessType,
  type CreatedAccountDTO,
  type Plan,
} from '@havuz/core';
import { ApiError, useCreateOrg, useUpdateOrg } from '@havuz/sdk';
import { Sheet } from '../ui/sheet';
import { Button } from '../ui/button';
import { Field, Input, Select } from '../ui/input';
import { Segmented } from '../ui/segmented';
import { TempPasswordNotice } from '../account/temp-password';

export interface OrgFormValues {
  id?: string;
  name: string;
  businessType?: BusinessType | null;
  city: string;
  district?: string | null;
  taxNo?: string | null;
  email?: string | null;
  phone?: string | null;
  plan?: Plan;
  creditLimit?: number;
  commissionBps?: number;
  iban?: string | null;
  active?: boolean;
  owner?: { name: string; email: string; phone?: string };
  leadId?: string;
}

/**
 * Yönetim: işletme/tedarikçi hesabı açma (başvurudan veya doğrudan) ve düzenleme.
 * Açılışta hesap sahibine geçici şifre e-postayla gider; ilk girişte değiştirmesi zorunludur.
 */
export function OrgFormSheet({ open, onClose, type, initial }: { open: boolean; onClose: () => void; type: 'member' | 'supplier'; initial?: OrgFormValues | null }) {
  const create = useCreateOrg();
  const update = useUpdateOrg();
  const editing = !!initial?.id;
  const [v, setV] = useState<Record<string, string>>({});
  const [active, setActive] = useState(true);
  const [plan, setPlan] = useState<Plan>('free');
  const [created, setCreated] = useState<CreatedAccountDTO | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    if (!open) return;
    setCreated(null);
    setActive(initial?.active ?? true);
    setPlan(initial?.plan ?? 'free');
    setV({
      name: initial?.name ?? '',
      businessType: initial?.businessType ?? 'cafe',
      city: initial?.city ?? 'İstanbul',
      district: initial?.district ?? '',
      taxNo: initial?.taxNo ?? '',
      email: initial?.email ?? '',
      phone: initial?.phone ?? '',
      creditLimit: String(toLira(initial?.creditLimit ?? 10_000_000)),
      commission: String((initial?.commissionBps ?? 300) / 100),
      iban: initial?.iban ? formatIban(initial.iban) : '',
      ownerName: initial?.owner?.name ?? '',
      ownerEmail: initial?.owner?.email ?? '',
      ownerPhone: initial?.owner?.phone ?? '',
    });
  }, [open, initial]);

  const opt = (x: string | undefined) => (x && x.trim() ? x.trim() : undefined);

  async function submit() {
    try {
      if (editing) {
        await update.mutateAsync({
          id: initial!.id!,
          input: {
            name: v.name,
            city: v.city,
            district: opt(v.district) ?? null,
            taxNo: opt(v.taxNo) ?? null,
            email: opt(v.email) ?? null,
            phone: opt(v.phone) ?? null,
            active,
            ...(type === 'member' ? { plan, creditLimit: toKurus(Number(v.creditLimit)) } : {}),
            ...(type === 'supplier' ? { commissionBps: Math.round(Number(v.commission) * 100), iban: opt(v.iban) ?? null } : {}),
          },
        });
        toast.success('Kaydedildi');
        onClose();
      } else {
        const r = await create.mutateAsync({
          type,
          name: v.name,
          businessType: type === 'member' ? (v.businessType as BusinessType) : undefined,
          city: v.city,
          district: opt(v.district),
          taxNo: opt(v.taxNo),
          email: opt(v.email),
          phone: opt(v.phone),
          plan,
          creditLimit: toKurus(Number(v.creditLimit)),
          commissionBps: Math.round(Number(v.commission) * 100),
          iban: type === 'supplier' ? opt(v.iban) : undefined,
          owner: { name: v.ownerName, email: v.ownerEmail, phone: opt(v.ownerPhone) },
          leadId: initial?.leadId,
        });
        setCreated(r);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    }
  }

  const title = editing ? `${initial?.name} düzenle` : type === 'member' ? 'Yeni işletme hesabı' : 'Yeni tedarikçi hesabı';
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        created ? (
          <Button size="lg" className="w-full" onClick={onClose}>
            Tamam
          </Button>
        ) : (
          <Button size="lg" className="w-full" loading={create.isPending || update.isPending} onClick={submit}>
            {editing ? 'Kaydet' : 'Hesabı aç ve giriş bilgilerini gönder'}
          </Button>
        )
      }
    >
      {created ? (
        <TempPasswordNotice account={created} />
      ) : (
        <div className="space-y-5">
          <section className="space-y-4">
            <div className="text-sm font-semibold">Kuruluş</div>
            <Field label={type === 'member' ? 'İşletme adı' : 'Firma adı'}>
              <Input value={v.name ?? ''} onChange={set('name')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              {type === 'member' && !editing && (
                <Field label="İşletme türü">
                  <Select value={v.businessType} onChange={set('businessType')}>
                    {BUSINESS_TYPES.map((b) => (
                      <option key={b} value={b}>
                        {BUSINESS_TYPE_LABEL[b]}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Vergi / TC kimlik no">
                <Input value={v.taxNo ?? ''} onChange={set('taxNo')} inputMode="numeric" />
              </Field>
              <Field label="Şehir">
                <Input value={v.city ?? ''} onChange={set('city')} />
              </Field>
              <Field label="İlçe">
                <Input value={v.district ?? ''} onChange={set('district')} />
              </Field>
              <Field label="Kuruluş e-postası">
                <Input type="email" value={v.email ?? ''} onChange={set('email')} />
              </Field>
              <Field label="Kuruluş telefonu (WhatsApp)">
                <Input type="tel" value={v.phone ?? ''} onChange={set('phone')} />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <div className="text-sm font-semibold">Ticari koşullar</div>
            {type === 'member' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Üyelik">
                  <Segmented
                    value={plan}
                    onChange={setPlan}
                    className="w-full"
                    options={[
                      { value: 'free', label: 'Temel' },
                      { value: 'pro', label: 'Pro' },
                    ]}
                  />
                </Field>
                <Field label="Vadeli limit (₺)" hint="Açık vadeli borç bu tutarı aşamaz">
                  <Input type="number" value={v.creditLimit ?? ''} onChange={set('creditLimit')} />
                </Field>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Komisyon (%)" hint="KDV hariç satış tutarı üzerinden">
                  <Input type="number" step="0.1" value={v.commission ?? ''} onChange={set('commission')} />
                </Field>
                <Field label="Hakediş IBAN’ı">
                  <Input value={v.iban ?? ''} onChange={(e) => setV((x) => ({ ...x, iban: e.target.value.toUpperCase() }))} className="font-mono" placeholder="TR…" />
                </Field>
              </div>
            )}
            {editing && (
              <label className="flex items-center justify-between rounded-2xl border border-border p-4">
                <span>
                  <span className="block text-sm font-medium">Hesap aktif</span>
                  <span className="block text-xs text-fg-muted">Pasif hesabın kullanıcıları giriş yapamaz, açık oturumları kapanır.</span>
                </span>
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--primary))]" />
              </label>
            )}
          </section>

          {!editing && (
            <section className="space-y-4">
              <div className="text-sm font-semibold">Hesap sahibi</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ad soyad">
                  <Input value={v.ownerName ?? ''} onChange={set('ownerName')} />
                </Field>
                <Field label="E-posta (giriş için)">
                  <Input type="email" value={v.ownerEmail ?? ''} onChange={set('ownerEmail')} />
                </Field>
                <Field label="Cep telefonu">
                  <Input type="tel" value={v.ownerPhone ?? ''} onChange={set('ownerPhone')} />
                </Field>
              </div>
            </section>
          )}
        </div>
      )}
    </Sheet>
  );
}
