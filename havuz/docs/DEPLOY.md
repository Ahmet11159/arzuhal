# Havuz — Canlıya çıkış rehberi

Bu belge, sistemi gerçek kullanıcılara açmadan önce yapılması gerekenleri sırayla listeler.
Yazılım tarafı hazırdır; aşağıdakiler hesap açma ve yapılandırma adımlarıdır.

## 1. Barındırma seçenekleri

| Seçenek | Ne zaman | Not |
|---|---|---|
| **Docker** (önerilen) | Kendi sunucunuz, Render, Railway, Fly.io, Hetzner… | Zamanlanmış bakım süreç içinde dakikada bir çalışır. `Dockerfile` hazır. |
| **Vercel** | Hızlı başlangıç | Kök dizin `havuz/apps/web`. Bakım `vercel.json` içindeki cron ile çağrılır (5 dakikada bir; ücretsiz planda cron günde 1 kez çalışır, bu yüzden Pro plan veya harici bir zamanlayıcı gerekir). |

Her iki durumda da **PostgreSQL** gerekir (Neon, Supabase, RDS…). Migration'lar uygulama açılışında otomatik uygulanır.

## 2. Zorunlu ortam değişkenleri

| Değişken | Değer |
|---|---|
| `APP_URL` | Sitenin adresi, ör. `https://havuz.app` |
| `SESSION_SECRET` | `openssl rand -base64 48` çıktısı |
| `DATABASE_URL` | PostgreSQL bağlantı adresi |
| `AUTO_SEED` | `false` (gerçek ortamda demo verisi olmasın) |
| `PAYMENT_PROVIDER` | `iyzico` |
| `IYZICO_API_KEY`, `IYZICO_SECRET_KEY` | iyzico panelinden |
| `IYZICO_BASE_URL` | `https://api.iyzipay.com` |
| `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` | `resend` ve anahtarı; gönderen alan adı Resend'de doğrulanmış olmalı |
| `CRON_SECRET` | Yalnızca Vercel'de; rastgele uzun bir değer |

İsteğe bağlı: `WHATSAPP_PROVIDER=cloud`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE`.

## 3. Dış hesaplar

1. **iyzico** — Önce sandbox hesabı (sandbox-merchant.iyzipay.com) ile test edin: `IYZICO_BASE_URL=https://sandbox-api.iyzipay.com`
   ve iyzico'nun test kartlarıyla bir sipariş, bir vadeli borç ve bir Pro üyelik ödemesi yapın. Ardından canlı üye işyeri
   başvurusu. Tedarikçilere ödemenin otomatik bölünmesi istenirse **pazaryeri (alt üye işyeri)** sözleşmesi gerekir;
   mevcut yapıda hakedişler Havuz tarafından havale ile ödenir ve sistemde takip edilir.
2. **Resend** (veya başka bir e-posta sağlayıcısı) — gönderen alan adının SPF/DKIM kayıtları.
3. **WhatsApp Business (Meta)** — işletme doğrulaması, telefon numarası ve onaylı bir mesaj şablonu.
4. **e-Fatura entegratörü** — aylık hesap özeti verileri (`/api/v1/member/statements/:ay`) entegratöre aktarılarak
   resmî fatura kesilir. Bu bağlantı entegratör seçildikten sonra eklenir.

## 4. İlk kurulum

1. Uygulamayı boş veritabanıyla başlatın (`AUTO_SEED=false`).
2. Yönetim hesabı oluşturun:
   ```bash
   DATABASE_URL=... npx tsx apps/web/scripts/create-admin.ts "Ad Soyad" yonetici@alanadiniz.com
   ```
   Komut geçici bir şifre yazdırır; ilk girişte değiştirmeniz istenir.
3. Yönetim panelinden kategorileri ve ürün kartlarını girin, tedarikçi hesaplarını açın, ilk dalgayı oluşturun.
4. `/api/health` adresinin `"ok": true` döndüğünü ve ödeme/e-posta sağlayıcılarının doğru göründüğünü kontrol edin.

## 5. Yayından önce kontrol

- [ ] `npm test` ve `npm run verify` (PostgreSQL üzerinde) tam geçiyor
- [ ] iyzico sandbox'ta başarılı ve başarısız ödeme denendi, dönüş adresi (`APP_URL`) doğru
- [ ] Şifre sıfırlama e-postası gerçek bir adrese ulaştı
- [ ] Veritabanı yedeklemesi açık (günlük, en az 7 gün saklama)
- [ ] Alan adı HTTPS ile açılıyor
- [ ] KVKK aydınlatma metni ve kullanım koşulları açılış sayfasına eklendi (hukuk danışmanından)

## 6. Ölçek büyüyünce

- Birden fazla uygulama sunucusunda giriş denemesi sınırı ortak tutulmalı (Redis); şu an süreç içidir.
- Mal kabul fotoğrafları veritabanı yerine nesne depolamaya (S3/R2) taşınmalı.
- Analitik sorgular materialized view'lara taşınmalı (bkz. ARCHITECTURE.md §7).
- Next.js 15+ sürümüne yükseltme planlanmalı.
