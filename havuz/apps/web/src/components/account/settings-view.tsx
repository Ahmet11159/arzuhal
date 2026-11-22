'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { formatIban, passwordProblem, type CreatedAccountDTO } from '@havuz/core';
import { ApiError, useChangePassword, useInviteUser, useSetUserActive, useSettings, useUpdateProfile } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { PageSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty';
import { fmtRelative } from '@/lib/format';
import { TempPasswordNotice } from './temp-password';

const errMsg = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : 'İşlem başarısız');

/** Tüm roller için ortak ayarlar: profil, kuruluş iletişim bilgileri, IBAN (tedarikçi), şifre, ekip. */
export function SettingsView() {
  const { data, isLoading, error, refetch } = useSettings();
  const profile = useUpdateProfile();
  const setActive = useSetUserActive();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [iban, setIban] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!data) return;
    setName(data.user.name);
    setPhone(data.user.phone ?? '');
    setOrgEmail(data.org.email ?? '');
    setOrgPhone(data.org.phone ?? '');
    setIban(data.org.iban ? formatIban(data.org.iban) : '');
  }, [data]);

  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Yüklenemedi'} onRetry={() => refetch()} />;
  const owner = data.user.isOwner;
  const isSupplier = data.org.type === 'supplier';

  async function saveProfile() {
    try {
      await profile.mutateAsync({
        name,
        phone: phone.trim() || null,
        ...(owner ? { orgEmail: orgEmail.trim() || null, orgPhone: orgPhone.trim() || null } : {}),
        ...(owner && isSupplier ? { iban: iban.trim() || null } : {}),
      });
      toast.success('Bilgiler kaydedildi');
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ayarlar" description={`${data.org.name} · profil, güvenlik ve ekip`} />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Profil ve iletişim" description={owner ? 'Kuruluş bilgilerini yalnızca hesap sahibi değiştirebilir' : undefined} />
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Adınız">
                <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </Field>
              <Field label="Cep telefonunuz">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="05xx xxx xx xx" />
              </Field>
              <Field label="Kuruluş e-postası" hint="Fatura ve bildirimler">
                <Input value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} disabled={!owner} type="email" />
              </Field>
              <Field label="Kuruluş telefonu" hint="WhatsApp bildirimleri bu numaraya gider">
                <Input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} disabled={!owner} type="tel" />
              </Field>
            </div>
            {isSupplier && (
              <Field label="Hakediş IBAN’ı" hint="Hakediş ödemeleri bu hesaba yapılır. TR ile başlayan 26 karakter.">
                <Input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} disabled={!owner} placeholder="TR00 0000 0000 0000 0000 0000 00" className="font-mono" />
              </Field>
            )}
            <Button onClick={saveProfile} loading={profile.isPending}>
              Kaydet
            </Button>
          </CardBody>
        </Card>

        <PasswordCard />

        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title={<span className="inline-flex items-center gap-2"><Users className="h-4 w-4" /> Ekip</span>}
            description="Aynı hesapla çalışan kişiler. Her kişinin kendi girişi olur; işlemler kayıtlarda ismiyle görünür."
            action={
              owner ? (
                <Button size="sm" onClick={() => setInviting(true)}>
                  <UserPlus className="h-4 w-4" /> Kişi ekle
                </Button>
              ) : undefined
            }
          />
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {data.team.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-sm font-semibold text-primary">{u.name[0]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {u.name}
                    {u.isOwner && <Badge tone="accent">Hesap sahibi</Badge>}
                    {u.id === data.user.id && <Badge>Siz</Badge>}
                    {!u.active && <Badge tone="danger">Pasif</Badge>}
                    {u.mustChangePassword && u.active && <Badge tone="warning">İlk giriş bekleniyor</Badge>}
                  </div>
                  <div className="text-xs text-fg-muted">
                    {u.email} · {u.lastLoginAt ? `son giriş ${fmtRelative(u.lastLoginAt)}` : 'henüz giriş yapmadı'}
                  </div>
                </div>
                {owner && u.id !== data.user.id && (
                  <Button
                    size="sm"
                    variant={u.active ? 'ghost' : 'secondary'}
                    loading={setActive.isPending && setActive.variables?.id === u.id}
                    onClick={async () => {
                      try {
                        await setActive.mutateAsync({ id: u.id, active: !u.active });
                        toast.success(u.active ? `${u.name} pasifleştirildi; açık oturumları kapatıldı` : `${u.name} yeniden aktif`);
                      } catch (e) {
                        toast.error(errMsg(e));
                      }
                    }}
                  >
                    {u.active ? 'Pasifleştir' : 'Aktifleştir'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <InviteSheet open={inviting} onClose={() => setInviting(false)} />
    </div>
  );
}

function PasswordCard() {
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const problem = next ? passwordProblem(next) : null;
  return (
    <Card>
      <CardHeader title={<span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Şifre</span>} description="Şifre değişince diğer cihazlardaki oturumlarınız kapanır." />
      <CardBody>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (next !== again) return toast.error('Yeni şifreler eşleşmiyor');
            try {
              await change.mutateAsync({ currentPassword: current, newPassword: next });
              setCurrent('');
              setNext('');
              setAgain('');
              toast.success('Şifreniz değiştirildi');
            } catch (err) {
              toast.error(errMsg(err));
            }
          }}
        >
          <Field label="Mevcut şifre">
            <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Yeni şifre" error={problem ?? undefined} hint="En az 8 karakter, harf ve rakam">
              <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
            </Field>
            <Field label="Yeni şifre (tekrar)" error={again && again !== next ? 'Şifreler eşleşmiyor' : undefined}>
              <Input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" variant="secondary" loading={change.isPending} disabled={!current || !next || !!problem || next !== again}>
            <KeyRound className="h-4 w-4" /> Şifreyi değiştir
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invite = useInviteUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [created, setCreated] = useState<CreatedAccountDTO | null>(null);
  const close = () => {
    setCreated(null);
    setName('');
    setEmail('');
    setPhone('');
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title="Ekibe kişi ekle"
      footer={
        created ? (
          <Button size="lg" className="w-full" onClick={close}>
            Tamam
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full"
            loading={invite.isPending}
            onClick={async () => {
              try {
                setCreated(await invite.mutateAsync({ name, email, phone: phone.trim() || undefined }));
              } catch (e) {
                toast.error(errMsg(e));
              }
            }}
          >
            Hesap aç ve davet gönder
          </Button>
        )
      }
    >
      {created ? (
        <TempPasswordNotice account={created} />
      ) : (
        <div className="space-y-4">
          <Field label="Ad soyad">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="E-posta">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Cep telefonu (isteğe bağlı)">
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <p className="text-xs text-fg-muted">Kişiye geçici bir şifre e-postayla gönderilir. İlk girişte kendi şifresini belirler. Ekip üyeleri sipariş verebilir ve görüntüleyebilir; ekip yönetimini yalnızca hesap sahibi yapar.</p>
        </div>
      )}
    </Sheet>
  );
}
