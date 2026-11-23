'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { BUSINESS_TYPE_LABEL, BUSINESS_TYPES, leadInput, toKurus, type BusinessType } from '@havuz/core';
import { useApply } from '@havuz/sdk';
import { Button } from '../ui/button';
import { Field, Input, Select } from '../ui/input';
import { Segmented } from '../ui/segmented';

export function LeadForm() {
  const apply = useApply();
  const [kind, setKind] = useState<'member' | 'supplier'>('member');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const spend = Number(fd.get('monthlySpend') || 0);
    const raw = {
      kind,
      businessName: String(fd.get('businessName') ?? ''),
      contactName: String(fd.get('contactName') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      email: String(fd.get('email') ?? ''),
      city: String(fd.get('city') ?? ''),
      businessType: String(fd.get('businessType') ?? 'cafe') as BusinessType,
      monthlySpend: spend ? toKurus(spend) : undefined,
      kvkkConsent: fd.get('kvkkConsent') === 'on',
    };
    const parsed = leadInput.safeParse(raw);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      await apply.mutateAsync(parsed.data);
      setDone(true);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Gönderilemedi' });
    }
  }

  return (
    <div className="relative rounded-3xl border border-border bg-surface p-6 shadow-lift sm:p-8">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-12 text-center">
            <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}>
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </motion.div>
            <h3 className="mt-5 text-xl font-semibold">Başvurunuz alındı</h3>
            <p className="mt-2 max-w-sm text-sm text-fg-muted">Bölge ekibimiz 1 iş günü içinde sizi arayıp hesabınızı açacak. Bu sırada demoyu inceleyebilirsiniz.</p>
            <a href="/giris" className="mt-6 text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Canlı demoyu aç →
            </a>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={onSubmit} noValidate className="space-y-4" exit={{ opacity: 0 }}>
            <Segmented
              value={kind}
              onChange={setKind}
              className="w-full"
              options={[
                { value: 'member', label: 'İşletmeyim' },
                { value: 'supplier', label: 'Tedarikçiyim' },
              ]}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="İşletme adı" error={errors.businessName}>
                <Input name="businessName" autoComplete="organization" placeholder="Örn. Moda Sahil Kahve" />
              </Field>
              <Field label="Ad soyad" error={errors.contactName}>
                <Input name="contactName" autoComplete="name" />
              </Field>
              <Field label="Telefon" error={errors.phone}>
                <Input name="phone" type="tel" autoComplete="tel" placeholder="05xx xxx xx xx" />
              </Field>
              <Field label="E-posta" error={errors.email}>
                <Input name="email" type="email" autoComplete="email" />
              </Field>
              <Field label="Şehir" error={errors.city}>
                <Input name="city" defaultValue="İstanbul" autoComplete="address-level1" />
              </Field>
              <Field label={kind === 'member' ? 'İşletme türü' : 'Faaliyet alanı'} error={errors.businessType}>
                <Select name="businessType" defaultValue="cafe">
                  {BUSINESS_TYPES.map((b) => (
                    <option key={b} value={b}>
                      {BUSINESS_TYPE_LABEL[b]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {kind === 'member' && (
              <Field label="Aylık tedarik harcaması (₺, isteğe bağlı)" hint="Tasarruf analizinizi hazırlamamız için">
                <Input name="monthlySpend" type="number" inputMode="numeric" min={0} placeholder="250000" />
              </Field>
            )}
            <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-fg-muted">
              <input type="checkbox" name="kvkkConsent" className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--primary))]" />
              <span>
                Kişisel verilerimin başvurumun değerlendirilmesi için işlenmesine ilişkin{' '}
                <Link href="/kvkk" target="_blank" className="font-medium text-fg underline underline-offset-2">
                  aydınlatma metnini
                </Link>{' '}
                okudum.
              </span>
            </label>
            {errors.kvkkConsent && <p className="-mt-2 text-xs text-danger">{errors.kvkkConsent}</p>}
            {errors.form && <p className="text-sm text-danger">{errors.form}</p>}
            <Button type="submit" size="lg" className="w-full" loading={apply.isPending}>
              Başvuruyu gönder
            </Button>
            <p className="text-center text-xs text-fg-subtle">Üyelik ücretsizdir. Bilgileriniz yalnızca başvurunuzu değerlendirmek için kullanılır.</p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
