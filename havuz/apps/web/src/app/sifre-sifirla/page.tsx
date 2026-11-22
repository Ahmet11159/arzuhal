'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { passwordProblem } from '@havuz/core';
import { ApiError, useResetPassword } from '@havuz/sdk';
import { AuthCard } from '@/components/account/auth-card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const reset = useResetPassword();
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const problem = next ? passwordProblem(next) : null;

  if (!token) {
    return (
      <p className="text-sm text-fg-muted">
        Bağlantı eksik. <Link href="/sifremi-unuttum" className="font-medium text-primary hover:underline">Yeni bir sıfırlama isteyin</Link>.
      </p>
    );
  }
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (next !== again) return toast.error('Şifreler eşleşmiyor');
        try {
          await reset.mutateAsync({ token, newPassword: next });
          toast.success('Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz.');
          router.replace('/giris');
        } catch (err) {
          toast.error(err instanceof ApiError ? err.message : 'Şifre yenilenemedi');
        }
      }}
    >
      <Field label="Yeni şifre" error={problem ?? undefined} hint="En az 8 karakter, harf ve rakam">
        <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <Field label="Yeni şifre (tekrar)" error={again && again !== next ? 'Şifreler eşleşmiyor' : undefined}>
        <Input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={reset.isPending} disabled={!next || !!problem || next !== again}>
        Şifremi yenile
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Yeni şifre belirleyin" description="Şifreniz değişince tüm cihazlardaki oturumlarınız kapanır.">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthCard>
  );
}
