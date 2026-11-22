'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { StartPaymentInput } from '@havuz/core';
import { ApiError, useStartPayment } from '@havuz/sdk';

/** Ödemeyi sunucuda başlatır ve kullanıcıyı ödeme sayfasına (test veya iyzico) yönlendirir. */
export function usePay() {
  const start = useStartPayment();
  const [redirecting, setRedirecting] = useState(false);
  async function pay(input: StartPaymentInput) {
    try {
      const r = await start.mutateAsync(input);
      setRedirecting(true);
      window.location.assign(r.redirectUrl);
    } catch (e) {
      toast.error('Ödeme başlatılamadı', { description: e instanceof ApiError ? e.message : 'Lütfen tekrar deneyin' });
    }
  }
  return { pay, pending: start.isPending || redirecting, variables: start.variables };
}
