'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

/** ?odeme=basarili|hata dönüş parametresini bir kez bildirim olarak gösterir ve adresi temizler. */
export function PaymentResultToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const r = params.get('odeme');
  useEffect(() => {
    if (!r) return;
    if (r === 'basarili') toast.success('Ödeme başarılı', { description: 'Kartınızdan tahsilat yapıldı.' });
    else toast.error('Ödeme tamamlanamadı', { description: 'Kartınızdan para çekilmedi. Tekrar deneyebilirsiniz.' });
    router.replace(pathname);
  }, [r, router, pathname]);
  return null;
}
