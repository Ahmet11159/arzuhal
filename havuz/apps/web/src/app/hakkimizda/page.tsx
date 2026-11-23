import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell } from '@/components/legal/legal-shell';
import { LEGAL_UPDATED, loadCompany } from '@/components/legal/company';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Hakkımızda · Havuz' };

export default async function Page() {
  const c = await loadCompany();
  return (
    <LegalShell title="Hakkımızda" updated={LEGAL_UPDATED} path="/hakkimizda">
      <p>
        <strong>{c.brandName}</strong>, bağımsız kafe, restoran ve fırınların tedarik alımlarını bir araya getiren ortak satın alma ağıdır. Tek başına küçük olan
        siparişler haftalık “dalgalarda” birleşir; toplam hacim arttıkça herkesin birim fiyatı düşer. Böylece zincir işletmelerin hacim avantajı bağımsız işletmelere de
        ulaşır.
      </p>
      <h2>Nasıl çalışır?</h2>
      <ul>
        <li>İşletmeler standart ürün kartlarından, birden çok tedarikçinin teklifini karşılaştırarak sipariş verir.</li>
        <li>Siparişler dalgada birleşir; kademeli fiyat herkese uygulanır, kapanışta düşen fiyat farkı otomatik iade edilir.</li>
        <li>Tedarikçiler toplu ve planlı sipariş alır; ödemeleri iyzico üzerinden güvenle alınır ve payları doğrudan hesaplarına aktarılır.</li>
        <li>Mal kabul, iade ve faturalar tek ekrandan izlenir.</li>
      </ul>
      <h2>Şirket bilgileri</h2>
      <table>
        <tbody>
          <tr>
            <td>Ticari unvan</td>
            <td>{c.legalName}</td>
          </tr>
          <tr>
            <td>Adres</td>
            <td>{c.address}</td>
          </tr>
          <tr>
            <td>Vergi dairesi / no</td>
            <td>
              {c.taxOffice} / {c.taxNo}
            </td>
          </tr>
          {c.mersisNo && (
            <tr>
              <td>MERSİS no</td>
              <td>{c.mersisNo}</td>
            </tr>
          )}
          {c.tradeRegistryNo && (
            <tr>
              <td>Ticaret sicil no</td>
              <td>{c.tradeRegistryNo}</td>
            </tr>
          )}
          {c.etbisNo && (
            <tr>
              <td>ETBİS kaydı</td>
              <td>{c.etbisNo}</td>
            </tr>
          )}
        </tbody>
      </table>
      <p>
        Bize ulaşmak için <Link href="/iletisim">iletişim</Link> sayfasını kullanabilirsiniz.
      </p>
    </LegalShell>
  );
}
