# Havuz — Kafe ve Restoranlar İçin Ortak Satın Alma Ağı

> Bağımsız işletmeler, zincir gücüyle alır.

Havuz, bağımsız kafe ve restoranların satın alma hacmini birleştirir, tedarikçilerden
**kademeli fiyat** alır ve tüm tedariki **tek ekrana, tek faturaya, vadeli ödemeye** indirir.

Bu klasör, ARZUHAL reposu içinde bağımsız bir monorepodur. ARZUHAL sitesine dokunmaz.

## Bilgisayarınızda çalıştırma

Gereken tek şey **Node.js 20 veya üzeri** (https://nodejs.org → "LTS" sürümünü kurun).
Veritabanı kurmanız gerekmez.

```bash
git clone https://github.com/Ahmet11159/arzuhal.git
cd arzuhal
git checkout claude/bold-hypatia-yv6cka   # PR birleştirildiyse bu adımı atlayın
cd havuz
npm install
npm run dev
```

Ardından tarayıcıda **http://localhost:3100** adresini açın.

İlk açılışta gömülü veritabanı (PGlite) oluşturulur ve demo verisi otomatik yüklenir.
Harici bir veritabanı kurmanız gerekmez.

| Rol | E-posta | Şifre |
|---|---|---|
| İşletme (üye) | `uye@havuz.app` | `havuz123` |
| Tedarikçi | `tedarikci@havuz.app` | `havuz123` |
| Yönetim | `yonetim@havuz.app` | `havuz123` |

Giriş ekranında her rol için tek tıkla demo butonu vardır.

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu (port 3100) |
| `npm run build` / `npm start` | Production derleme ve sunucu |
| `npm test` | İş kuralı birim testleri (`@havuz/core`, Vitest) |
| `npm run typecheck` | Tüm paketlerde TypeScript kontrolü |
| `npm run db:generate` | Şema değişikliğinden SQL migration üretir (drizzle-kit) |
| `npm run db:seed` | Boş veritabanına demo verisi yükler |
| `npm run db:reset` | Tüm tabloları temizleyip demo verisini yeniden yükler |
| `npm run verify` | Çalışan sunucuya karşı 208 kontrollü arka uç doğrulaması (PostgreSQL; gömülü veritabanında 166): yetki, para hesapları, kartla ödeme, pazaryeri payı, karta iade, eşzamanlı stok/dalga/hakediş yarışları, ürün onayı, fatura, yasal sayfalar, hesap açma ve oturum iptali, şifre sıfırlama, bakım işleri. Önce `npm run db:reset`. |
| `npm run verify:iyzico -w @havuz/web` | iyzico entegrasyonunu iyzico API'sini taklit eden yerel sunucuyla uçtan uca sınar: imza, alt satıcı kaydı, bölünmüş sepet, dönüş, tutar sahteciliği, karta kısmi iade, mükerrer ödemenin iadesi, ürün onayı. Pazaryeri (35) ve standart hesap (27) modları. |
| `npm run iyzico:check` | Gerçek iyzico anahtarlarınızı ve imzayı para hareketi olmadan kontrol eder; `.env` sorunlarını satır satır söyler. |
| `npm run create-admin -w @havuz/web -- "Ad" e@posta` | Boş kurulumda ilk yönetim hesabını açar. |

## Ortam değişkenleri (`apps/web/.env`)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `SESSION_SECRET` | geliştirmede sabit | Oturum JWT imzası. **Production'da en az 32 karakter zorunlu.** |
| `DATABASE_URL` | boş → PGlite | Doluysa PostgreSQL'e bağlanır (`postgres://…`). Migration'lar açılışta otomatik uygulanır. |
| `PGLITE_DIR` | `./.data/pglite` | Gömülü veritabanı klasörü. |
| `AUTO_SEED` | geliştirmede `true`, production'da `false` | Boş veritabanına demo verisi yüklensin mi? |
| `CRON_SECRET` | boş | `/api/v1/cron/maintenance` uç noktasının anahtarı (sunucusuz kurulumda zamanlanmış görev için). |
| `HAVUZ_SCHEDULER` | açık | `off` ise dakikalık otomatik bakım süreç içinde çalışmaz. |
| `APP_URL` | `http://localhost:3100` | E-posta bağlantıları ve iyzico dönüş adresi için sitenin adresi. |
| `PAYMENT_PROVIDER` | geliştirmede `test` | `test` (uygulama içi test ödeme sayfası) veya `iyzico`. iyzico için `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL`. |
| `IYZICO_MARKETPLACE` | `false` | iyzico hesabınız Pazaryeri olarak tanımlanınca `true`: ödeme tedarikçi payı ayrılarak alınır, tedarikçiye iyzico öder. |
| `EMAIL_PROVIDER` / `WHATSAPP_PROVIDER` | `console` | `resend` / `cloud` ile gerçek gönderim. Tüm liste: `apps/web/.env.example`. |

Canlıya çıkış adımları için [`docs/DEPLOY.md`](docs/DEPLOY.md) dosyasına bakın.

## Ne içeriyor?

**Açılış sayfası.** React Three Fiber ile 3D ağ sahnesi (merkezde havuz, çevresinde işletmeler ve
tedarikçiler, aralarında akan sipariş darbeleri), canlı dalga geri sayımı, gerçek fiyat motoruyla
çalışan etkileşimli kademe demosu, tasarruf hesaplayıcı, üyelik planları ve başvuru formu.

**İşletme paneli (`/uye`)**
- Özet: aylık harcama ve tasarruf, kategori dağılımı, emsal işletme fiyat karşılaştırması, açık dalga.
- Katalog: standart ürün kartları, aynı ürün için birden çok tedarikçi teklifi, kademe merdiveni, havuz ilerlemesi.
- Dalga: kademeye yakın ürünler, tek tıkla "eksik miktarı ekle", geçmiş dalga iadeleri.
- Sepet: tedarikçiye göre gruplama, peşin / 30 / 60 gün vade, KDV ve vade farkı hesabı, kullanım ve iptal-iade koşulları onayı.
- Siparişler: durum zaman çizelgesi, "teslim aldım", 48 saat içinde fotoğraflı mal kabul bildirimi, karta iadeler, tedarikçi faturalarını indirme, tekrar sipariş.
- Hesap: size dönen tutarlar ve karta iadeler, vadeli ödemeler, aylık hesap özeti, Pro'ya geçiş.

**Tedarikçi paneli (`/tedarikci`).** Ciro, açık dalga talep tahmini, müşteriye göre gruplanmış
kalemler (onayla, sevk et, teslim edildi, iptal), fiyat/kademe/stok düzenleme, katalogdaki ürünlere yeni
teklif, sipariş faturası yükleme, **ödeme bilgileri** (iyzico alt satıcı kaydı: şirket türü, unvan, VKN/TCKN, IBAN),
**hakedişler** (yoldaki ve onaylanmış ödemeler, komisyon ve KDV'si, iade dökümü, yazdırılabilir hakediş belgesi).

**Yönetim paneli (`/yonetim`).** İşlem hacmi ve büyüme, **platform gelir kırılımı** (komisyon,
abonelik, finansman, sponsorlu ürün), dalga açma ve kapatma, başvurudan veya doğrudan işletme/tedarikçi
hesabı açma ve düzenleme (plan, vadeli limit, komisyon, pasifleştirme), ürün ve kategori yönetimi,
tedarikçi ödeme bilgileri ve iyzico kaydı, hakediş belgeleri, **ödemeler ve iadeler** (sorunlu iadeyi yeniden
deneme / elle tamamlandı işaretleme), mal kabul onayı, ürün fotoğrafları, şirket bilgileri (yasal sayfalar),
işlem kaydı ve gönderilen e-posta/WhatsApp mesajları.

**Ödeme (pazaryeri).** Peşin siparişte kart ödemesi (30 dakika içinde ödenmezse sipariş iptal ve stok iade),
vadeli borç ve Pro üyelik ödemesi. iyzico Pazaryeri modelinde her sipariş kalemi ayrı sepet kalemidir ve
tedarikçinin payını (tutar − komisyon − komisyon KDV'si) taşır; teslim + 48 saat itiraz süresi dolunca ürün
onayı verilir ve iyzico payı doğrudan tedarikçiye öder. Havuz tedarikçi parasını tutmaz. İptal, dalga kademe
farkı ve mal kabul iadesi ödenmiş siparişte kalem bazında **karta iade**, ödenmemişte borçtan düşümdür.
İadeler önce kayda yazılır, sonra gönderilir; sonucu belirsiz kalan iade yönetimin kontrolüne düşer (çift
iade yok). Mükerrer veya geç gelen ödemeler tamamen karta iade edilir.

**Hesap ve güvenlik.** Geçici şifreyle açılan hesap ilk girişte şifre belirler; ekip üyeleri; şifre
değiştirme ve e-postayla sıfırlama; şifre değişince ve kullanıcı pasifleşince tüm oturumlar anında düşer;
kim neyi ne zaman yaptı işlem kaydında.

**Bildirimler.** Uygulama içi bildirim zili, e-posta ve WhatsApp: yeni sipariş, sevkiyat, dalga açılışı ve
kapanış hatırlatması, kademe farkı, karta iade, vade yaklaşıyor/geçti, mal kabul sonucu, fatura yüklendi,
tedarikçi ödemesi onaylandı, IBAN değişikliği.

**Yasal.** Hakkımızda, iletişim, KVKK aydınlatma metni, gizlilik ve çerez politikası, kullanım koşulları,
satış sözleşmesi, iptal-iade ve teslimat sayfaları; şirket bilgileri yönetim ayarlarından doldurulur.
Başvuruda KVKK onayı, her siparişte koşul onayı kaydedilir. Türkçe 404/hata sayfaları, robots ve site
haritası, paneller dizinlenmez; HSTS ve içerik güvenlik politikası (CSP).

**Genel.** Açık ve koyu tema (sistem + elle seçim), mobilde alt sekme çubuğu ve alttan açılan
paneller, PWA manifest, `prefers-reduced-motion` desteği.

## Mimari

Ayrıntılar için [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) dosyasına bakın.

```
havuz/
├── packages/
│   ├── core/   → iş kuralları, veri sözleşmeleri (zod), tasarım token'ları — platformdan bağımsız
│   └── sdk/    → tip güvenli REST istemcisi + React Query hook'ları — web ve React Native ortak
└── apps/
    └── web/    → Next.js 14 (App Router): REST API (/api/v1) + web arayüzü
```

Mobil uygulama, `core` ve `sdk` paketlerini doğrudan kullanır ve aynı `/api/v1` uç noktalarına
`Authorization: Bearer` ile bağlanır. İş kuralları ve API katmanı yeniden yazılmaz, yalnızca
ekranlar yazılır.
