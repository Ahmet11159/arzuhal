import type { Metadata } from 'next';
import { ISSUE_REPORT_WINDOW_HOURS, PAYMENT_WINDOW_MINUTES } from '@havuz/core';
import { LegalShell } from '@/components/legal/legal-shell';
import { LEGAL_UPDATED, loadCompany } from '@/components/legal/company';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'İptal, iade ve teslimat koşulları · Havuz' };

export default async function Page() {
  const c = await loadCompany();
  return (
    <LegalShell title="İptal, iade ve teslimat koşulları" updated={LEGAL_UPDATED} path="/iptal-iade">
      <h2>Teslimat</h2>
      <ul>
        <li><strong>Dalga siparişleri</strong> dalganın ilan edilen teslim tarihinde, <strong>hemen teslim</strong> siparişleri tedarikçinin belirttiği sürede (genellikle 1–3 iş günü) işletme adresine teslim edilir.</li>
        <li>Sipariş durumunu (onay, hazırlık, yolda, teslim) Platform’dan izleyebilir, “Teslim aldım” ile teslimatı onaylayabilirsiniz.</li>
        <li>Teslimat bedeli ayrıca belirtilmedikçe ürün fiyatına dahildir.</li>
      </ul>

      <h2>Siparişin iptali</h2>
      <ul>
        <li>Ödemesi tamamlanmamış peşin siparişi sipariş sayfasından iptal edebilirsiniz. Ödeme {PAYMENT_WINDOW_MINUTES} dakika içinde yapılmazsa sipariş kendiliğinden iptal edilir; sizden ödeme alınmaz.</li>
        <li>Ödenmiş siparişin iptali için tedarikçi siparişi henüz sevk etmediyse <a href={`mailto:${c.email}`}>{c.email}</a> adresinden veya {c.phone} numarasından destek ekibine ulaşın.</li>
        <li>Tedarikçi bir kalemi tedarik edemezse kalemi iptal eder; bedeli peşin ödemede kartınıza iade edilir, vadeli siparişte borcunuzdan düşülür.</li>
      </ul>

      <h2>Eksik, hasarlı veya yanlış ürün</h2>
      <ul>
        <li>Teslimden itibaren <strong>{ISSUE_REPORT_WINDOW_HOURS} saat</strong> içinde sipariş sayfasındaki “Sorun bildir” ile ürünü, adedi ve sorun türünü fotoğrafla bildirin.</li>
        <li>Bildirim incelenir ve genellikle 1 iş günü içinde sonuçlandırılır. Onaylanan tutar (etkilenen adetlerin KDV dahil bedeli) peşin ödemede kartınıza iade edilir, vadeli siparişte borcunuzdan düşülür.</li>
        <li>Ürünün iadesi (geri alınması) gerekiyorsa tedarikçi teslimatla birlikte ya da ayrıca teslim alır; bu işlem için sizden ücret alınmaz.</li>
      </ul>

      <h2>Dalga kademe farkı</h2>
      <p>Dalga kapandığında nihai fiyat, sipariş verdiğiniz fiyattan düşükse aradaki fark (KDV dahil) otomatik olarak peşin ödemede kartınıza iade edilir, vadeli siparişte borcunuzdan düşülür.</p>

      <h2>İadelerin kartınıza yansıması</h2>
      <p>İadeler ödeme kuruluşu iyzico üzerinden ödemeyi yaptığınız karta yapılır. İade, işlem günü bankanıza iletilir; hesabınıza yansıması bankanıza bağlı olarak genellikle 2–10 iş günü sürer. Tüm iadeleri sipariş sayfanızda ve “Hesap” bölümünde durumu ile birlikte görebilirsiniz.</p>

      <h2>Cayma hakkı</h2>
      <p>Platform yalnızca ticari işletmelere hizmet verdiğinden, 6502 sayılı Tüketicinin Korunması Hakkında Kanun’daki cayma hakkı bu işlemlere uygulanmaz. Ayıplı ürünlerde Türk Ticaret Kanunu ve Türk Borçlar Kanunu hükümleri ile yukarıdaki mal kabul süreci geçerlidir.</p>
    </LegalShell>
  );
}
