'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import type { CreatedAccountDTO } from '@havuz/core';

/** Yeni hesabın geçici şifresi: yalnızca bir kez gösterilir, e-postayla da gönderilir. */
export function TempPasswordNotice({ account }: { account: CreatedAccountDTO }) {
  const [copied, setCopied] = useState(false);
  const text = `E-posta: ${account.email}\nGeçici şifre: ${account.temporaryPassword}`;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl bg-success-soft p-4 text-sm text-success">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          Hesap açıldı ve giriş bilgileri <b>{account.email}</b> adresine e-postayla gönderildi. Kullanıcı ilk girişte kendi şifresini belirleyecek.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-muted/40 p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Geçici şifre · yalnızca şimdi görünür</div>
        <div className="mt-2 font-mono text-2xl font-semibold tracking-wider">{account.temporaryPassword}</div>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              /* pano erişimi yoksa kullanıcı elle kopyalar */
            }
          }}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Kopyalandı' : 'Giriş bilgilerini kopyala'}
        </button>
      </div>
    </div>
  );
}
