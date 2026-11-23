import type { Metadata } from 'next';
import Link from 'next/link';
import { ISSUE_REPORT_WINDOW_HOURS } from '@havuz/core';
import { LegalShell } from '@/components/legal/legal-shell';
import { LEGAL_UPDATED, loadCompany } from '@/components/legal/company';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Satış sözleşmesi · Havuz' };

export default async function Page() {
  const c = await loadCompany();
  return (
    <LegalShell title="Mesafeli satış sözleşmesi (işletmeler arası)" updated={LEGAL_UPDATED} path="/satis-sozlesmesi">
      <p>
        Bu sözleşme, Platform üzerinden verilen her siparişte, sipariş onayı ile Satıcı ve Alıcı arasında elektronik ortamda kurulur. Sipariş özeti, sipariş numarası,
        ürünler, fiyatlar ve teslimat bilgileri sözleşmenin ayrılmaz parçasıdır ve Alıcı’nın sipariş sayfasında saklanır.
      </p>

      <h2>1. Taraflar</h2>
      <ul>
        <li><strong>Satıcı:</strong> Siparişteki ürünü tedarik eden ve sipariş sayfasında adı yazan tedarikçi. Satıcı’nın unvanı, adresi ve vergi bilgileri düzenlediği faturada yer alır.</li>
        <li><strong>Alıcı:</strong> Siparişi veren üye işletme (fatura bilgileri üyelik kaydındaki bilgilerdir).</li>
        <li>
          <strong>Aracı hizmet sağlayıcı:</strong> {c.legalName}, {c.address}
          {c.taxNo ? `, ${c.taxOffice} V.D. ${c.taxNo}` : ''}, {c.email}, {c.phone}
          {c.etbisNo ? ` (ETBİS: ${c.etbisNo})` : ''}.
        </li>
      </ul>

      <h2>2. Konu</h2>
      <p>Alıcı’nın Platform üzerinden sipariş verdiği ürünlerin satışı ve teslimine ilişkin tarafların hak ve yükümlülükleri.</p>

      <h2>3. Fiyat ve ödeme</h2>
      <ul>
        <li>Ürün fiyatları KDV hariç gösterilir; KDV ürünün oranına göre eklenir. Dalga siparişlerinde nihai fiyat dalga kapanışında kesinleşir ve sipariş fiyatından yüksek olamaz.</li>
        <li>Ödeme; peşin siparişte sipariş anında, vadeli siparişte vade tarihinde kartla, ödeme kuruluşu iyzico aracılığıyla yapılır. Vade farkı sipariş özetinde gösterilir.</li>
        <li>Ödeme, Satıcı adına Aracı tarafından ödeme kuruluşu üzerinden tahsil edilir; Satıcı’nın payı teslim ve mal kabul süresinden sonra ödeme kuruluşu tarafından Satıcı’ya aktarılır.</li>
      </ul>

      <h2>4. Teslimat</h2>
      <p>Ürünler Alıcı’nın üyelik kaydındaki adresine, sipariş sayfasında belirtilen tarihte veya sürede teslim edilir. Teslimata ilişkin ayrıntılar <Link href="/iptal-iade">iptal, iade ve teslimat koşullarında</Link> yer alır.</p>

      <h2>5. Mal kabul ve ayıplı ürün</h2>
      <p>Alıcı teslim aldığı ürünleri kontrol eder; eksik, hasarlı, kalitesiz veya yanlış ürünleri teslimden itibaren {ISSUE_REPORT_WINDOW_HOURS} saat içinde Platform üzerinden fotoğrafla bildirir. Onaylanan bildirimlerde bedel Alıcı’ya iade edilir. Süresinde bildirilmeyen açık ayıplar için TTK md. 23 hükümleri saklıdır.</p>

      <h2>6. Cayma hakkı</h2>
      <p>Taraflar tacir olduğundan ve işlem ticari amaçlı olduğundan, 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği’ndeki tüketici cayma hakkı uygulanmaz.</p>

      <h2>7. Fatura</h2>
      <p>Satıcı, teslim ettiği ürünler için mevzuata uygun e-Fatura / e-Arşiv faturasını düzenler ve Platform’a yükler; Alıcı faturayı sipariş sayfasından indirebilir.</p>

      <h2>8. Uyuşmazlık</h2>
      <p>Bu sözleşmeden doğan uyuşmazlıklarda İstanbul (Merkez) mahkemeleri ve icra daireleri yetkilidir. Diğer konularda <Link href="/kullanim-kosullari">kullanım koşulları</Link> geçerlidir.</p>
    </LegalShell>
  );
}
