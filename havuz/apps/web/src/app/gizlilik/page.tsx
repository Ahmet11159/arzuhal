import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell } from '@/components/legal/legal-shell';
import { LEGAL_UPDATED, loadCompany } from '@/components/legal/company';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Gizlilik ve çerez politikası · Havuz' };

export default async function Page() {
  const c = await loadCompany();
  return (
    <LegalShell title="Gizlilik ve çerez politikası" updated={LEGAL_UPDATED} path="/gizlilik">
      <p>
        {c.brandName}, işletmelerin ve tedarikçilerin bilgilerini yalnızca hizmeti sunmak için kullanır, satmaz ve reklam amacıyla paylaşmaz. Kişisel verilerin
        işlenmesine ilişkin ayrıntılar <Link href="/kvkk">KVKK aydınlatma metninde</Link> yer alır.
      </p>

      <h2>Güvenlik önlemleri</h2>
      <ul>
        <li>Tüm bağlantılar şifrelidir (HTTPS). Şifreler geri döndürülemez biçimde (bcrypt) saklanır; şifre sıfırlama bağlantılarının yalnızca özeti tutulur.</li>
        <li>Kart bilgileri Platform’a hiç gelmez; ödeme sayfası iyzico tarafından sunulur ve kart verisi orada işlenir (PCI DSS).</li>
        <li>Her istekte yetki kontrolü yapılır: bir işletme başka bir işletmenin, bir tedarikçi başka bir tedarikçinin verisini göremez.</li>
        <li>Kim, neyi, ne zaman değiştirdi bilgisi işlem kayıtlarında tutulur; IBAN değişiklikleri hesap sahibine ayrıca bildirilir.</li>
        <li>Art arda hatalı girişler geçici olarak engellenir; şifre değişince eski oturumlar kapanır.</li>
      </ul>

      <h2>Çerezler ve tarayıcıda tutulan bilgiler</h2>
      <table>
        <thead>
          <tr>
            <th>Ad</th>
            <th>Tür</th>
            <th>Amaç</th>
            <th>Süre</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Oturum çerezi</td>
            <td>Zorunlu</td>
            <td>Giriş yaptığınızı hatırlamak (httpOnly, güvenli)</td>
            <td>7 gün (çıkış yapınca silinir)</td>
          </tr>
          <tr>
            <td>Sepet ve tema tercihi</td>
            <td>Zorunlu (yerel depolama)</td>
            <td>Sepetinizi ve açık/koyu tema seçiminizi cihazınızda tutmak</td>
            <td>Siz silene kadar</td>
          </tr>
        </tbody>
      </table>
      <p>
        Platform reklam, pazarlama veya üçüncü taraf analiz çerezi kullanmaz. Yalnızca hizmetin çalışması için zorunlu çerezler kullanıldığından ayrıca çerez onayı
        istenmez. Tarayıcı ayarlarınızdan çerezleri silebilirsiniz; bu durumda yeniden giriş yapmanız gerekir.
      </p>

      <h2>İletişim</h2>
      <p>
        Sorularınız için <a href={`mailto:${c.email}`}>{c.email}</a> adresine yazabilirsiniz.
      </p>
    </LegalShell>
  );
}
