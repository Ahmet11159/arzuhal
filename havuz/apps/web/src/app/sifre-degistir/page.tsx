'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { passwordProblem, type Role } from '@havuz/core';
import { ApiError, useChangePassword, useLogout, useMe } from '@havuz/sdk';
import { AuthCard } from '@/components/account/auth-card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

const HOME: Record<Role, string> = { member: '/uye', supplier: '/tedarikci', admin: '/yonetim' };

/** Geçici şifreyle ilk giriş: kullanıcı kendi şifresini belirlemeden uygulamaya geçemez. */
export default function ForceChangePasswordPage() {
  const router = useRouter();
  const me = useMe();
  const change = useChangePassword();
  const logout = useLogout();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const problem = next ? passwordProblem(next) : null;

  return (
    <AuthCard
      title="Kendi şifrenizi belirleyin"
      description={me.data ? `Hoş geldiniz ${me.data.user.name}. Güvenliğiniz için size e-postayla gelen geçici şifreyi değiştirin.` : 'Güvenliğiniz için geçici şifrenizi değiştirin.'}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (next !== again) return toast.error('Yeni şifreler eşleşmiyor');
          try {
            await change.mutateAsync({ currentPassword: current, newPassword: next });
            toast.success('Şifreniz belirlendi');
            const role = me.data?.user.role ?? 'member';
            router.replace(HOME[role]);
            router.refresh();
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Şifre değiştirilemedi');
          }
        }}
      >
        <Field label="Geçici şifre">
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="Yeni şifre" error={problem ?? undefined} hint="En az 8 karakter, harf ve rakam">
          <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Yeni şifre (tekrar)" error={again && again !== next ? 'Şifreler eşleşmiyor' : undefined}>
          <Input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={change.isPending} disabled={!current || !next || !!problem || next !== again}>
          Şifremi kaydet ve devam et
        </Button>
        <button
          type="button"
          onClick={async () => {
            await logout.mutateAsync().catch(() => undefined);
            router.replace('/giris');
          }}
          className="w-full text-center text-sm text-fg-muted hover:text-fg"
        >
          Çıkış yap
        </button>
      </form>
    </AuthCard>
  );
}
