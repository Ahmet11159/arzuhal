'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, BadgeCheck, Landmark, RefreshCw } from 'lucide-react';
import { formatIban, SUB_MERCHANT_TYPE_LABEL, SUB_MERCHANT_TYPES, type PayoutProfileDTO, type PayoutProfileInput, type SubMerchantType } from '@havuz/core';
import { usePayoutProfile, useUpdatePayoutProfile } from '@havuz/sdk';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Kaydedilemedi');

/** iyzico kayıt durumu rozeti. */
export function PayoutStatusBadge({ p }: { p: Pick<PayoutProfileDTO, 'status' | 'marketplace'> }) {
  const st = p.status;
  if (st.error) return <Badge tone="danger">iyzico kaydı hatalı</Badge>;
  if (st.registered) return <Badge tone="success">iyzico’ya kayıtlı</Badge>;
  if (!st.complete) return <Badge tone="warning">Bilgiler eksik</Badge>;
  return <Badge tone={p.marketplace ? 'warning' : 'neutral'}>{p.marketplace ? 'Kayıt bekliyor' : 'Hazır'}</Badge>;
}

/** Tedarikçi ödeme (iyzico alt satıcı) bilgileri formu — tedarikçi ayarları ve yönetim ekranında ortak. */
export function PayoutProfileForm({
  profile,
  editable,
  saving,
  onSave,
}: {
  profile: PayoutProfileDTO;
  editable: boolean;
  saving: boolean;
  onSave: (input: PayoutProfileInput) => Promise<void>;
}) {
  const [type, setType] = useState<SubMerchantType>(profile.subMerchantType ?? 'LIMITED_OR_JOINT_STOCK_COMPANY');
  const [legalTitle, setLegalTitle] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNo, setTaxNo] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [address, setAddress] = useState('');
  const [iban, setIban] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    setType(profile.subMerchantType ?? 'LIMITED_OR_JOINT_STOCK_COMPANY');
    setLegalTitle(profile.legalTitle ?? '');
    setTaxOffice(profile.taxOffice ?? '');
    setTaxNo(profile.taxNo ?? '');
    setContactName(profile.contactName ?? '');
    setAddress(profile.address ?? '');
    setIban(profile.iban ? formatIban(profile.iban) : '');
    setEmail(profile.email ?? '');
    setPhone(profile.phone ?? '');
    setIdentityNumber('');
  }, [profile]);

  const company = type !== 'PERSONAL';
  const needsTckn = type !== 'LIMITED_OR_JOINT_STOCK_COMPANY';

  async function save() {
    try {
      await onSave({
        subMerchantType: type,
        legalTitle: company ? legalTitle : '',
        taxOffice: company ? taxOffice : '',
        taxNo: type === 'LIMITED_OR_JOINT_STOCK_COMPANY' ? taxNo.replace(/\s+/g, '') : '',
        identityNumber: needsTckn ? identityNumber.replace(/\s+/g, '') : '',
        contactName,
        address,
        iban,
        email,
        phone,
      });
      toast.success('Ödeme bilgileri kaydedildi');
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-4">
      {profile.status.error && (
        <div className="flex gap-2 rounded-xl bg-danger-soft p-3 text-[13px] text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>iyzico kaydı yapılamadı: {profile.status.error}</span>
        </div>
      )}
      {!profile.status.complete && profile.status.problems.length > 0 && (
        <div className="flex gap-2 rounded-xl bg-warning-soft p-3 text-[13px] text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Eksik: {profile.status.problems.join(', ')}</span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Şirket türü">
          <Select value={type} onChange={(e) => setType(e.target.value as SubMerchantType)} disabled={!editable}>
            {SUB_MERCHANT_TYPES.map((t) => (
              <option key={t} value={t}>
                {SUB_MERCHANT_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={company ? 'Yetkili ad soyad' : 'Ad soyad'}>
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} disabled={!editable} autoComplete="name" />
        </Field>
        {company && (
          <>
            <Field label="Ticari unvan" hint="Vergi levhasındaki tam unvan">
              <Input value={legalTitle} onChange={(e) => setLegalTitle(e.target.value)} disabled={!editable} />
            </Field>
            <Field label="Vergi dairesi">
              <Input value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} disabled={!editable} />
            </Field>
          </>
        )}
        {type === 'LIMITED_OR_JOINT_STOCK_COMPANY' ? (
          <Field label="Vergi no (VKN)" hint="10 hane">
            <Input value={taxNo} onChange={(e) => setTaxNo(e.target.value)} disabled={!editable} inputMode="numeric" maxLength={10} className="font-mono" />
          </Field>
        ) : (
          <Field label={type === 'PERSONAL' ? 'T.C. kimlik no' : 'Şirket sahibinin T.C. kimlik no'} hint={profile.identityNumberMasked ? `Kayıtlı: ${profile.identityNumberMasked} · değiştirmek için yazın` : '11 hane'}>
            <Input value={identityNumber} onChange={(e) => setIdentityNumber(e.target.value)} disabled={!editable} inputMode="numeric" maxLength={11} className="font-mono" autoComplete="off" />
          </Field>
        )}
        <Field label="Ödeme IBAN’ı" hint={company ? 'Hesap şirket unvanına kayıtlı olmalı' : 'Hesap sizin adınıza kayıtlı olmalı'}>
          <Input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} disabled={!editable} placeholder="TR00 0000 0000 0000 0000 0000 00" className="font-mono" />
        </Field>
        <Field label="E-posta">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!editable} type="email" />
        </Field>
        <Field label="Telefon">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!editable} type="tel" placeholder="05xx xxx xx xx" />
        </Field>
      </div>
      <Field label="Açık adres" hint="Fatura adresi">
        <Input value={address} onChange={(e) => setAddress(e.target.value)} disabled={!editable} />
      </Field>
      {editable && (
        <Button onClick={save} loading={saving}>
          Kaydet{profile.marketplace ? ' ve iyzico’ya gönder' : ''}
        </Button>
      )}
    </div>
  );
}

/** Tedarikçi ayarlarındaki "Ödeme bilgileri" kartı. */
export function SupplierPayoutCard({ owner }: { owner: boolean }) {
  const { data, isLoading } = usePayoutProfile();
  const update = useUpdatePayoutProfile();
  return (
    <Card className="xl:col-span-2">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Landmark className="h-4 w-4" /> Ödeme bilgileri
          </span>
        }
        description={
          data?.marketplace
            ? 'Satışlarınızdaki payınız iyzico tarafından doğrudan bu hesaba ödenir. Bilgiler tamamlanmadan sipariş alamazsınız.'
            : 'Hakediş ödemeleri bu bilgilere göre yapılır.'
        }
        action={data ? <PayoutStatusBadge p={data} /> : undefined}
      />
      <CardBody>
        {isLoading || !data ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            {data.status.registered && (
              <p className="mb-4 inline-flex items-center gap-2 text-[13px] text-success">
                <BadgeCheck className="h-4 w-4" /> iyzico alt satıcı kaydınız aktif.
                {!owner && ' Değişiklikleri hesap sahibi yapabilir.'}
              </p>
            )}
            {!data.status.registered && !owner && (
              <p className="mb-4 inline-flex items-center gap-2 text-[13px] text-fg-muted">
                <RefreshCw className="h-4 w-4" /> Bu bilgileri hesap sahibi doldurabilir.
              </p>
            )}
            <PayoutProfileForm
              profile={data}
              editable={owner}
              saving={update.isPending}
              onSave={async (i) => {
                await update.mutateAsync(i);
              }}
            />
          </>
        )}
      </CardBody>
    </Card>
  );
}
