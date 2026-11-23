'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FileUp } from 'lucide-react';
import { INVOICE_MAX_BYTES, toKurus, trInputValue } from '@havuz/core';
import { ApiError, useUploadInvoice } from '@havuz/sdk';
import { Sheet } from '@/components/ui/sheet';
import { Field, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Dosya okunamadı'));
    r.readAsDataURL(file);
  });
}

/** Tedarikçinin sipariş faturasını yüklediği panel. */
export function InvoiceSheet({ target, onClose }: { target: { orderId: string; orderNumber: string; member: string } | null; onClose: () => void }) {
  const upload = useUploadInvoice();
  const [number, setNumber] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setNumber('');
    setDate(trInputValue(new Date()).slice(0, 10));
    setAmount('');
    setFile(null);
    setErr(null);
  }, [target]);

  async function submit() {
    setErr(null);
    const lira = Number(amount.replace(/\./g, '').replace(',', '.'));
    if (!number.trim()) return setErr('Fatura numarasını girin');
    if (!Number.isFinite(lira) || lira <= 0) return setErr('KDV dahil fatura tutarını girin');
    if (!file) return setErr('Fatura dosyasını seçin (PDF veya görsel)');
    if (file.size > INVOICE_MAX_BYTES) return setErr('Dosya en fazla 2 MB olabilir');
    try {
      await upload.mutateAsync({
        orderId: target!.orderId,
        number: number.trim(),
        issuedAt: new Date(`${date}T12:00:00+03:00`),
        amount: toKurus(lira),
        fileName: file.name,
        file: await readAsDataUrl(file),
      });
      toast.success('Fatura yüklendi; işletmeye bildirildi');
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Yüklenemedi');
    }
  }

  return (
    <Sheet
      open={!!target}
      onClose={onClose}
      title={target ? `Fatura yükle · ${target.orderNumber}` : ''}
      footer={
        <Button size="lg" className="w-full" loading={upload.isPending} onClick={submit}>
          <FileUp className="h-4 w-4" /> Yükle
        </Button>
      }
    >
      {target && (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            {target.member} için kestiğiniz e-Fatura / e-Arşiv faturasının PDF’ini (veya görselini) yükleyin. İşletme sipariş sayfasından indirebilir. Aynı sipariş için
            yeniden yüklerseniz öncekinin yerine geçer.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fatura numarası">
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="ör. ABC2026000000123" className="font-mono" />
            </Field>
            <Field label="Fatura tarihi">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="KDV dahil tutar (TL)">
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="ör. 1.250,50" />
          </Field>
          <Field label="Dosya" hint="PDF, JPG, PNG veya WebP · en fazla 2 MB">
            <input
              type="file"
              accept={ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
            />
          </Field>
          {err && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}
        </div>
      )}
    </Sheet>
  );
}
