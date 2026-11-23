import type { Metadata } from 'next';
import Link from 'next/link';
import { ISSUE_REPORT_WINDOW_HOURS, PAYMENT_WINDOW_MINUTES } from '@havuz/core';
import { LegalShell } from '@/components/legal/legal-shell';
import { LEGAL_UPDATED, loadCompany } from '@/components/legal/company';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Kullanım koşulları · Havuz' };

export default async function Page() {
  const c = await loadCompany();
  return (
    <LegalShell title="Üyelik ve kullanım koşulları" updated={LEGAL_UPDATED} path="/kullanim-kosullari">
      <h2>1. Taraflar ve konu</h2>
      <p>
        Bu koşullar, <strong>{c.legalName}</strong> (“{c.brandName}”) tarafından işletilen ortak satın alma platformunun (“Platform”) üye işletmeler (“İşletme”) ve
        tedarikçiler (“Tedarikçi”) tarafından kullanımını düzenler. Platform’a giriş yapan ve sipariş veren veya teklif açan her kullanıcı bu koşulları kabul etmiş
        sayılır; her siparişte koşulların onaylandığı zaman kaydedilir.
      </p>

      <h2>2. Platform’un rolü</h2>
      <p>
        {c.brandName} bir aracı hizmet sağlayıcıdır. Ürünlerin satıcısı ilgili Tedarikçi, alıcısı İşletme’dir; satış sözleşmesi bu iki taraf arasında kurulur (bkz.{' '}
        <Link href="/satis-sozlesmesi">satış sözleşmesi</Link>). {c.brandName}; siparişleri bir araya getirir (dalga), kademeli fiyatı hesaplar, ödemenin güvenli
        alınmasını, teslimat ve mal kabul sürecini ve tedarikçi ödemesini yönetir. Ürünlerin ayıptan ari olması, mevzuata uygunluğu ve faturalandırılması Tedarikçi’nin
        sorumluluğundadır.
      </p>

      <h2>3. Üyelik</h2>
      <ul>
        <li>Platform yalnızca ticari faaliyette bulunan işletmelere (tacir veya esnaf) hizmet verir; tüketicilere satış yapılmaz.</li>
        <li>Üyelik başvurusu {c.brandName} tarafından değerlendirilir; başvuru gerekçe gösterilmeden reddedilebilir.</li>
        <li>Hesap sahibi, ekibine kişi ekleyebilir ve bu kişilerin hesap üzerinden yaptığı işlemlerden sorumludur. Giriş bilgilerinin gizliliği kullanıcıya aittir.</li>
        <li>Temel üyelik ücretsizdir. Pro üyelik aylık ücretlidir; düşük vade farkı ve 60 gün vade gibi ek haklar sağlar.</li>
      </ul>

      <h2>4. Sipariş, dalga ve fiyat</h2>
      <ul>
        <li>Dalga, belirli bir kapanış saatine kadar açık olan toplu sipariş dönemidir. Dalgadaki toplam miktar arttıkça kademeli fiyat düşer.</li>
        <li>Sipariş anındaki fiyat, o ana kadar havuzda biriken miktara göre hesaplanır. Dalga kapanınca nihai kademe belirlenir; nihai fiyat hiçbir zaman ödenen fiyattan yüksek olamaz. Aradaki fark (KDV dahil) peşin ödemede kartınıza iade edilir, vadeli siparişte borcunuzdan düşülür.</li>
        <li>“Hemen teslim” siparişleri dalgayı beklemez ve tedarikçinin taban fiyatından verilir.</li>
        <li>Fiyatlar KDV hariç gösterilir; KDV her ürünün oranına göre ayrıca hesaplanır.</li>
      </ul>

      <h2>5. Ödeme</h2>
      <ul>
        <li>Kartla ödemeler lisanslı ödeme kuruluşu iyzico aracılığıyla alınır; kart bilgileri Platform’da tutulmaz.</li>
        <li>Peşin siparişte ödeme {PAYMENT_WINDOW_MINUTES} dakika içinde tamamlanmazsa sipariş iptal edilir ve ayrılan stok serbest kalır.</li>
        <li>Vadeli siparişler, İşletme’ye tanımlanan vadeli limit dahilinde verilir ve vade tarihinde kartla ödenir. Vade farkı sipariş özetinde gösterilir.</li>
        <li>Vadesi geçen borç ödenmeden yeni vadeli sipariş verilemeyebilir; {c.brandName} gecikme halinde hesabı kısıtlama hakkını saklı tutar.</li>
        <li>Pazaryeri modelinde ödeme anında Tedarikçi’nin payı ayrılır ve teslimden sonra ödeme kuruluşu tarafından doğrudan Tedarikçi’ye aktarılır.</li>
      </ul>

      <h2>6. Teslimat ve mal kabul</h2>
      <ul>
        <li>Tedarikçi, siparişi onaylayıp belirtilen sürede teslim eder. Dalga siparişleri dalganın teslim tarihinde teslim edilir.</li>
        <li>İşletme, teslim aldığı ürünleri kontrol eder; eksik, hasarlı, kalitesiz veya yanlış ürünü teslimden itibaren <strong>{ISSUE_REPORT_WINDOW_HOURS} saat</strong> içinde fotoğrafla bildirir. Süre geçtikten sonra yapılan bildirimler kabul edilmez.</li>
        <li>Bildirimler {c.brandName} tarafından incelenir; onaylanan tutar İşletme’ye iade edilir ve Tedarikçi’nin payından düşülür.</li>
      </ul>

      <h2>7. Tedarikçi’nin yükümlülükleri</h2>
      <ul>
        <li>Teklif ettiği ürünleri stok, fiyat ve kademe bilgileriyle doğru tanımlamak; onayladığı siparişi zamanında ve eksiksiz teslim etmek.</li>
        <li>Her sipariş için mevzuata uygun e-Fatura / e-Arşiv faturasını düzenleyip Platform’a yüklemek.</li>
        <li>Ödeme bilgilerini (IBAN, şirket bilgileri) doğru ve güncel tutmak.</li>
        <li>{c.brandName}’a, teslim edilen ürün bedeli (KDV hariç) üzerinden sözleşmede belirlenen komisyonu ve bunun KDV’sini ödemek; komisyon ödeme anında payından ayrılır ve {c.brandName} tarafından faturalandırılır.</li>
      </ul>

      <h2>8. Kullanım kuralları</h2>
      <p>Platform’un hukuka aykırı amaçlarla kullanılması, başka hesaplara erişilmeye çalışılması, otomatik araçlarla aşırı yük oluşturulması veya yanıltıcı bilgi verilmesi yasaktır. Bu durumlarda hesap askıya alınabilir veya kapatılabilir.</p>

      <h2>9. Sorumluluğun sınırı</h2>
      <p>{c.brandName}, Tedarikçi’nin ürün ve teslimat yükümlülüklerinden doğan zararlardan, mücbir sebeplerden ve ödeme kuruluşu, internet veya altyapı sağlayıcılarından kaynaklanan kesintilerden sorumlu değildir. {c.brandName}’ın sorumluluğu, her durumda ilgili siparişten elde ettiği komisyon tutarı ile sınırlıdır.</p>

      <h2>10. Fikri mülkiyet</h2>
      <p>Platform’un yazılımı, tasarımı ve içeriği {c.legalName}’e aittir; izinsiz kopyalanamaz ve çoğaltılamaz.</p>

      <h2>11. Değişiklik ve fesih</h2>
      <p>{c.brandName} bu koşulları güncelleyebilir; güncel metin bu sayfada yayımlanır ve sonraki siparişlerde geçerli olur. Taraflar üyeliği her zaman sona erdirebilir; sona ermeden önce verilmiş siparişlere ilişkin yükümlülükler devam eder.</p>

      <h2>12. Uyuşmazlık</h2>
      <p>Bu koşullardan doğan uyuşmazlıklarda Türk hukuku uygulanır; İstanbul (Merkez) mahkemeleri ve icra daireleri yetkilidir. {c.brandName}’ın elektronik kayıtları HMK md. 193 uyarınca delil sözleşmesi niteliğindedir.</p>
    </LegalShell>
  );
}
