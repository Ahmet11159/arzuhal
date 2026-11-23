import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell } from '@/components/legal/legal-shell';
import { LEGAL_UPDATED, loadCompany } from '@/components/legal/company';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'KVKK aydınlatma metni · Havuz' };

export default async function Page() {
  const c = await loadCompany();
  return (
    <LegalShell title="Kişisel verilerin işlenmesine ilişkin aydınlatma metni" updated={LEGAL_UPDATED} path="/kvkk">
      <p>
        Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) md. 10 ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında
        Tebliğ uyarınca, {c.brandName} platformunu (“Platform”) kullanan işletme ve tedarikçi yetkilileri, çalışanları ve başvuru sahipleri için hazırlanmıştır.
      </p>

      <h2>1. Veri sorumlusu</h2>
      <p>
        <strong>{c.legalName}</strong> ({c.address}
        {c.mersisNo ? `, MERSİS: ${c.mersisNo}` : ''}) kişisel verileriniz bakımından veri sorumlusudur. İletişim: <a href={`mailto:${c.kvkkEmail}`}>{c.kvkkEmail}</a>
        {c.kepAddress ? <>, KEP: {c.kepAddress}</> : null}.
      </p>

      <h2>2. İşlenen kişisel veriler</h2>
      <ul>
        <li><strong>Kimlik:</strong> ad soyad; tedarikçi şahıs şirketlerinde T.C. kimlik numarası (ödeme kuruluşu kaydı için).</li>
        <li><strong>İletişim:</strong> e-posta, telefon, işletme adresi.</li>
        <li><strong>Müşteri işlem:</strong> sipariş, teslimat, mal kabul bildirimi, fatura ve hesap hareketleri.</li>
        <li><strong>Finans:</strong> ödeme tutarları, iade kayıtları, tedarikçi IBAN’ı. Kart bilgileriniz Platform’da tutulmaz; doğrudan ödeme kuruluşu tarafından işlenir.</li>
        <li><strong>İşlem güvenliği:</strong> giriş kayıtları, IP adresi, işlem kayıtları (log), şifrenin geri döndürülemez özeti.</li>
        <li><strong>Görsel kayıt:</strong> mal kabul bildirimlerinde yüklediğiniz ürün fotoğrafları.</li>
      </ul>

      <h2>3. İşleme amaçları</h2>
      <ul>
        <li>Üyelik başvurusunun değerlendirilmesi, hesabın açılması ve yönetilmesi,</li>
        <li>Siparişlerin alınması, tedarikçiye iletilmesi, teslimatın ve mal kabulün yürütülmesi,</li>
        <li>Ödemelerin alınması, iadelerin yapılması, tedarikçi ödemelerinin ve komisyon faturalarının hazırlanması,</li>
        <li>Sipariş, ödeme ve teslimatla ilgili bildirimlerin e-posta / WhatsApp ile gönderilmesi,</li>
        <li>Bilgi güvenliğinin sağlanması, kötüye kullanımın önlenmesi, yetkili kurumlara karşı yükümlülüklerin yerine getirilmesi,</li>
        <li>Ticari ve vergisel kayıtların mevzuatın öngördüğü sürelerle saklanması.</li>
      </ul>

      <h2>4. Hukuki sebepler</h2>
      <p>
        Kişisel verileriniz KVKK md. 5/2 uyarınca; (c) bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması, (ç) veri sorumlusunun hukuki yükümlülüğünü yerine
        getirebilmesi (Türk Ticaret Kanunu, Vergi Usul Kanunu, 6563 sayılı Kanun vb.), (e) bir hakkın tesisi, kullanılması veya korunması ve (f) temel hak ve
        özgürlüklerinize zarar vermemek kaydıyla meşru menfaatlerimiz hukuki sebeplerine dayanarak işlenir. Ticari elektronik ileti (kampanya, tanıtım) gönderimi yalnızca
        ayrıca vereceğiniz onay ile yapılır; sipariş ve ödeme bildirimleri ticari ileti değildir.
      </p>

      <h2>5. Aktarım</h2>
      <ul>
        <li><strong>Tedarikçiler / işletmeler:</strong> siparişin ifası için gerekli ad, işletme adı, adres ve telefon bilgileri karşı tarafa aktarılır.</li>
        <li><strong>Ödeme kuruluşu (iyzico):</strong> ödeme, iade ve tedarikçi ödemesi (pazaryeri alt satıcı kaydı) işlemleri için.</li>
        <li><strong>Hizmet sağlayıcılar:</strong> barındırma, veritabanı, e-posta ve WhatsApp bildirim altyapısı. Sunucuları yurt dışında bulunan sağlayıcılara aktarım, KVKK md. 9’daki güvencelere uygun olarak yapılır.</li>
        <li><strong>Yetkili kurumlar:</strong> mevzuatın zorunlu kıldığı hallerde yetkili kamu kurum ve kuruluşlarına.</li>
      </ul>

      <h2>6. Toplama yöntemi</h2>
      <p>Verileriniz başvuru formu, Platform’daki hesabınız, mobil/web uygulaması ve ödeme kuruluşundan gelen işlem sonuçları aracılığıyla elektronik ortamda toplanır.</p>

      <h2>7. Saklama süresi</h2>
      <p>
        Hesap ve işlem verileri sözleşme süresince; ticari defter ve belgeler ile bunlara dayanak kayıtlar ilgili mevzuat gereği 10 yıl saklanır. Reddedilen başvurular
        en geç 1 yıl içinde silinir veya anonim hale getirilir. Süresi dolan veriler periyodik imha süreciyle silinir.
      </p>

      <h2>8. Haklarınız</h2>
      <p>KVKK md. 11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, amacına uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini, silinmesini veya yok edilmesini isteme, bu işlemlerin aktarılan kişilere bildirilmesini isteme, otomatik sistemlerle analiz sonucu aleyhinize bir sonuca itiraz etme ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme haklarına sahipsiniz.</p>
      <p>
        Başvurularınızı Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ’e uygun olarak, kimliğinizi doğrulayan bilgilerle <a href={`mailto:${c.kvkkEmail}`}>{c.kvkkEmail}</a>
        {c.kepAddress ? ` veya KEP (${c.kepAddress})` : ''} adresine ya da yazılı olarak {c.address} adresine iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz
        sonuçlandırılır.
      </p>
      <p>
        Çerezler ve tarayıcıda tutulan bilgiler için <Link href="/gizlilik">gizlilik ve çerez politikasına</Link> bakabilirsiniz.
      </p>
    </LegalShell>
  );
}
