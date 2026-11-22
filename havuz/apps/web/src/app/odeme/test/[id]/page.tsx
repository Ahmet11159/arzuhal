'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, CheckCircle2, CreditCard, FlaskConical, Lock, XCircle } from 'lucide-react';
import { formatTRY, PAYMENT_PURPOSE_LABEL, TEST_CARDS, testCardInput } from '@havuz/core';
import { ApiError, useCompleteTestPayment, useTestPayment } from '@havuz/sdk';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usePay } from '@/components/payment/use-pay';
import { cn } from '@/lib/cn';

const groupCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const fmtExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

/**
 * TEST MODU ödeme sayfası. Gerçek para çekilmez. Canlıda bu sayfa yerine iyzico'nun
 * güvenli ödeme sayfası açılır (kart bilgisi Havuz sunucularına hiç gelmez).
 */
export default function TestCheckoutPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, isLoading, error } = useTestPayment(params.id);
  const complete = useCompleteTestPayment(params.id);
  const retry = usePay();
  const [holder, setHolder] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [flip, setFlip] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message?: string; returnUrl: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const p = data?.payment;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = testCardInput.safeParse({ holder, cardNumber: number, expiry, cvc });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      return setErrors(errs);
    }
    setErrors({});
    try {
      const r = await complete.mutateAsync({ holder, cardNumber: number, expiry, cvc });
      setResult({ ok: r.status === 'succeeded', message: r.error, returnUrl: r.returnUrl });
      if (r.status === 'succeeded') setTimeout(() => router.replace(`${r.returnUrl}?odeme=basarili`), 1600);
    } catch (err) {
      setResult({ ok: false, message: err instanceof ApiError ? err.message : 'Ödeme yapılamadı', returnUrl: p?.returnUrl ?? '/uye' });
    }
  }

  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-warning/30 bg-warning-soft px-4 py-2.5 text-center text-sm font-medium text-warning">
        <FlaskConical className="mr-1.5 inline h-4 w-4" />
        TEST MODU · Gerçek para çekilmez. Canlı ortamda bu adımda iyzico’nun güvenli ödeme sayfası açılır.
      </div>
      <div className="mx-auto max-w-[980px] px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <Logo />
          {p && (
            <Link href={p.returnUrl} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
              <ArrowLeft className="h-4 w-4" /> Vazgeç
            </Link>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="mt-10 h-[420px]" />
        ) : error || !p ? (
          <div className="mt-10 rounded-2xl border border-danger/30 bg-danger-soft p-5 text-sm text-danger">Ödeme bulunamadı veya bu ödemeye erişiminiz yok.</div>
        ) : p.status !== 'pending' && !result ? (
          <div className="mt-10 rounded-2xl border border-border bg-surface p-6 text-sm">
            Bu ödeme artık geçerli değil ({p.status === 'succeeded' ? 'zaten ödendi' : 'iptal edildi veya başarısız oldu'}).{' '}
            <Link href={p.returnUrl} className="font-medium text-primary hover:underline">
              Geri dön
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_420px]">
            <div>
              <div className="text-sm text-fg-muted">{p.orgName}</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{PAYMENT_PURPOSE_LABEL[p.purpose]}</h1>
              {p.orderNumber && <div className="mt-1 font-mono text-sm text-fg-muted">{p.orderNumber}</div>}
              <div className="mt-6 text-4xl font-semibold tracking-tight tabular">{formatTRY(p.amount)}</div>

              {/* 3B kart görseli: CVC alanına gelince döner */}
              <div className="mt-8 [perspective:1200px]">
                <motion.div
                  animate={{ rotateY: flip ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 16 }}
                  className="relative h-[210px] w-full max-w-[360px] [transform-style:preserve-3d]"
                >
                  <div className="absolute inset-0 flex flex-col justify-between rounded-3xl bg-gradient-to-br from-[#0e3b2f] via-[#0a7356] to-[#2cc79a] p-6 text-white shadow-lift [backface-visibility:hidden]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold tracking-wider opacity-80">HAVUZ · TEST</span>
                      <CreditCard className="h-7 w-7 opacity-80" />
                    </div>
                    <div className="font-mono text-[22px] tracking-[0.12em]">{groupCard(number) || '•••• •••• •••• ••••'}</div>
                    <div className="flex justify-between text-xs uppercase opacity-90">
                      <span className="truncate">{holder || 'AD SOYAD'}</span>
                      <span>{expiry || 'AA/YY'}</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#0a7356] to-[#0e3b2f] shadow-lift [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="mt-8 h-11 bg-black/70" />
                    <div className="mx-6 mt-6 flex items-center justify-end rounded-md bg-white/90 px-3 py-2 font-mono text-sm text-black">{cvc || '•••'}</div>
                  </div>
                </motion.div>
              </div>

              <div className="mt-8 rounded-2xl border border-border bg-surface p-4 text-sm">
                <div className="mb-2 font-medium">Test kartları (tıklayınca doldurulur)</div>
                <div className="grid gap-2">
                  {[
                    { n: TEST_CARDS.success, l: 'Başarılı ödeme' },
                    { n: TEST_CARDS.declined, l: 'Banka reddi' },
                    { n: TEST_CARDS.insufficient, l: 'Yetersiz bakiye' },
                  ].map((c) => (
                    <button
                      key={c.n}
                      type="button"
                      onClick={() => {
                        setNumber(groupCard(c.n));
                        setExpiry('12/30');
                        setCvc('123');
                        if (!holder) setHolder('Test Kullanıcı');
                      }}
                      className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-left transition hover:border-primary/50 hover:bg-muted/50"
                    >
                      <span className="font-mono text-xs">{groupCard(c.n)}</span>
                      <span className="text-xs text-fg-muted">{c.l}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-6 shadow-card">
              {result ? (
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
                  {result.ok ? <CheckCircle2 className="mx-auto h-16 w-16 text-success" /> : <XCircle className="mx-auto h-16 w-16 text-danger" />}
                  <h2 className="mt-4 text-xl font-semibold">{result.ok ? 'Ödeme başarılı' : 'Ödeme başarısız'}</h2>
                  <p className="mt-2 text-sm text-fg-muted">{result.ok ? 'Yönlendiriliyorsunuz…' : result.message}</p>
                  {!result.ok && (
                    <div className="mt-6 flex flex-col gap-2">
                      <Button
                        loading={retry.pending}
                        onClick={() => {
                          // Reddedilen deneme kapanır; aynı ödeme için yeni bir deneme başlatılır.
                          if (!p) return;
                          void retry.pay(p.purpose === 'subscription' ? { purpose: 'subscription' } : { purpose: p.purpose, orderId: p.orderId ?? undefined });
                        }}
                      >
                        Başka kartla dene
                      </Button>
                      <Link href={result.returnUrl} className="text-sm text-fg-muted hover:text-fg">
                        Geri dön
                      </Link>
                    </div>
                  )}
                </motion.div>
              ) : (
                <form onSubmit={submit} className="space-y-4" noValidate>
                  <Field label="Kart üzerindeki ad" error={errors.holder}>
                    <Input value={holder} onChange={(e) => setHolder(e.target.value)} autoComplete="cc-name" />
                  </Field>
                  <Field label="Kart numarası" error={errors.cardNumber}>
                    <Input value={number} onChange={(e) => setNumber(groupCard(e.target.value))} inputMode="numeric" autoComplete="cc-number" className="font-mono" placeholder="0000 0000 0000 0000" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Son kullanma" error={errors.expiry}>
                      <Input value={expiry} onChange={(e) => setExpiry(fmtExpiry(e.target.value))} inputMode="numeric" autoComplete="cc-exp" placeholder="AA/YY" />
                    </Field>
                    <Field label="CVC" error={errors.cvc}>
                      <Input
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        onFocus={() => setFlip(true)}
                        onBlur={() => setFlip(false)}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                      />
                    </Field>
                  </div>
                  <Button type="submit" size="lg" className="w-full" loading={complete.isPending}>
                    <Lock className="h-4 w-4" /> {formatTRY(p.amount)} öde
                  </Button>
                  <p className={cn('flex items-start gap-2 text-xs text-fg-subtle')}>
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Test modunda yalnızca soldaki test kartları kabul edilir.
                  </p>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
