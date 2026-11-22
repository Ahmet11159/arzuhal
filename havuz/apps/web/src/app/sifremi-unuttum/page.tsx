'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { forgotPasswordInput } from '@havuz/core';
import { ApiError, useForgotPassword } from '@havuz/sdk';
import { AuthCard } from '@/components/account/auth-card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <AuthCard title="Şifremi unuttum" description="Hesabınızın e-posta adresini yazın; şifre sıfırlama bağlantısı gönderelim.">
      {sent ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl bg-success-soft p-4 text-sm text-success">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Bu adres kayıtlıysa birkaç dakika içinde bir sıfırlama bağlantısı gelecek. Bağlantı <b>1 saat</b> geçerlidir. Gelen kutunuzda yoksa gereksiz klasörüne bakın.
            </p>
          </div>
          <Link href="/giris" className="block text-center text-sm font-medium text-primary hover:underline">
            Girişe dön
          </Link>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const parsed = forgotPasswordInput.safeParse({ email });
            if (!parsed.success) return setError(parsed.error.issues[0].message);
            setError(null);
            try {
              await forgot.mutateAsync(parsed.data);
              setSent(true);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Gönderilemedi');
            }
          }}
        >
          <Field label="E-posta" error={error ?? undefined}>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={forgot.isPending}>
            Sıfırlama bağlantısı gönder
          </Button>
          <Link href="/giris" className="block text-center text-sm text-fg-muted hover:text-fg">
            Girişe dön
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
