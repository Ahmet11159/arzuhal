# Havuz — Mimari

## 1. Katmanlar

```
┌──────────────────────────────────────────────────────────────────────┐
│  İstemciler                                                          │
│  ┌───────────────────────┐   ┌─────────────────────────────────────┐ │
│  │ Web (Next.js, PWA)    │   │ Mobil (Expo / React Native) — sonra │ │
│  └──────────┬────────────┘   └──────────────────┬──────────────────┘ │
│             │       @havuz/sdk (istemci + hook'lar)                  │
│             │       @havuz/core (kurallar, şemalar, token'lar)       │
└─────────────┼────────────────────────────────────┼───────────────────┘
              │  HTTPS JSON  /api/v1/*             │
              │  çerez (web) · Bearer JWT (mobil)  │
┌─────────────▼────────────────────────────────────▼───────────────────┐
│  API katmanı   apps/web/src/app/api/v1/**/route.ts  (ince)           │
│                 └─ route()/publicRoute(): oturum, rol, zod, hata      │
│  Servisler     apps/web/src/server/services/*.ts  (iş akışları)      │
│                 └─ @havuz/core alan fonksiyonlarını çağırır           │
│  Veri          Drizzle ORM → PostgreSQL  (geliştirmede PGlite/WASM)   │
└──────────────────────────────────────────────────────────────────────┘
```

**Kural:** İş mantığı (fiyat kademeleri, dalga kapanışı, sipariş toplamları, KDV, vade farkı,
gelir hesabı) yalnızca `@havuz/core` içindedir ve birim testlerle korunur. Sunucu bu fonksiyonlarla
yetkili hesabı yapar. İstemci aynı fonksiyonlarla anlık önizleme gösterir (ör. sepet toplamı).
Böylece web, mobil ve sunucu hiçbir zaman farklı sonuç üretmez.

## 2. Paketler

| Paket | İçerik | Bağımlılık |
|---|---|---|
| `@havuz/core` | `money` (kuruş tam sayı), `domain/*` (pricing, wave, order, revenue, labels), `contracts/inputs` (zod istek şemaları), `contracts/dto` (yanıt tipleri), `design/tokens` | yalnızca `zod` |
| `@havuz/sdk` | `createHavuzClient()` (fetch tabanlı, DOM yok), `qk` sorgu anahtarları, React Query hook'ları | `core`, peer: `react`, `@tanstack/react-query` |
| `@havuz/web` | Next.js uygulaması: API, servisler, veritabanı, arayüz | `core`, `sdk` |

Paketler TypeScript kaynağı olarak dışa aktarılır (`main: src/index.ts`). Next.js'te
`transpilePackages`, Expo'da Metro bunları doğrudan derler; ayrı bir build adımı yoktur.

## 3. Veri modeli

| Tablo | Amaç |
|---|---|
| `organizations` | Üye işletme, tedarikçi veya operatör. Plan, vadeli limit, komisyon, puan. |
| `users` | Kuruluşa bağlı kullanıcılar (`member` / `supplier` / `admin`). |
| `categories`, `products` | **Standart ürün kartı.** Karşılaştırma ve havuzlama bu kart üzerinden yapılır. `market_price` tasarruf hesabının referansıdır. |
| `offers` | Tedarikçinin bir ürün için teklifi: taban fiyat, `tiers` (jsonb kademeler), stok, teslim süresi, sponsorluk. |
| `waves` | Toplu sipariş dalgası: kapanış, teslimat, durum, toplam iade. |
| `orders`, `order_items` | Sipariş, birden çok tedarikçiye ait kalemler. Kalemde `unit_price` (ödenen) ve `final_unit_price` (dalga sonrası) ayrı tutulur. |
| `issues` | Mal kabul bildirimleri (kalem başına bir). |
| `ledger_entries` | Üyenin hesap hareketleri: dalga kademe farkı, mal kabul iadesi, iptal (karta iade veya borçtan düşüm). |
| `payment_items` | Ödeme sepeti kalemleri: sipariş kalemi, tutar, tedarikçinin alt satıcı anahtarı ve payı, sağlayıcı işlem numarası, onay. |
| `refunds` | Karta iadeler: önce kaydedilir, sonra gönderilir; durum (sırada / işleniyor / tamam / yeniden denenecek / elle kontrol). |
| `invoices` | Tedarikçinin sipariş için yüklediği fatura (PDF/görsel). |
| `site_settings` | Yönetimin düzenlediği şirket bilgileri (yasal sayfalar). |
| `subscriptions` | Pro üyelik tahsilatları. |
| `leads` | Açılış sayfası başvuruları (yeni / hesap açıldı / reddedildi). |
| `payments` | Kart ödemeleri: amaç (sipariş, vadeli borç, üyelik), sağlayıcı, durum, sağlayıcı kimliği. |
| `settlements` | Hakediş (mutabakat) belgeleri; serbest bırakılmış kalemler `settlement_id` ile bağlanır. Kanal: `iyzico` (pazaryeri) veya `manual` (havale). |
| `notifications` | Uygulama içi bildirimler; `dedupe_key` aynı hatırlatmanın iki kez gitmesini önler. |
| `outbox` | E-posta / WhatsApp gönderim kuyruğu (5 deneme, artan bekleme). |
| `audit_logs` | İşlem kaydı: kişi, eylem, varlık, özet, IP. İşlemle aynı transaction'da yazılır. |
| `password_resets` | Şifre sıfırlama bağlantıları (yalnızca SHA-256 özeti saklanır, 1 saat geçerli). |

Para birimi her yerde **kuruş cinsinden tam sayıdır** (kayan nokta hatası yoktur). Fiyatlar KDV
hariçtir; KDV kalem bazında (%1 / %10 / %20) hesaplanır.

Şema `apps/web/src/server/db/schema.ts` dosyasındadır. Değişiklikten sonra `npm run db:generate`
ile migration üretilir. Migration'lar uygulama açılışında otomatik uygulanır.

## 4. Temel akışlar

### 4.1 Kademeli fiyat ve dalga
1. Üye dalgaya sipariş verir. Birim fiyat, **havuzdaki mevcut miktar ile kendi miktarının toplamına**
   göre belirlenir (`resolveTier`). Böylece katkısının etkisini anında görür.
2. Dalga kapanınca (`closeWave`) her teklifin toplam havuz miktarına göre nihai kademe bulunur.
3. Daha yüksek kademeden ödeyen her kalem için fark `ledger_entries`'e `wave_rebate` olarak yazılır.
   Nihai fiyat hiçbir zaman ödenenden yüksek olamaz.
4. Tüm adımlar tek bir transaction içinde çalışır. İkinci kapatma denemesi reddedilir.

### 4.2 Sipariş
`createOrder`: teklif, stok, aktiflik ve dalga kontrolü yapar. Kademe fiyatını belirler,
`computeOrderTotals` ile KDV ve vade farkını hesaplar. Vadeli siparişte limit kontrolü yapılır. Pazaryerinde
iyzico kaydı tamamlanmamış tedarikçinin ürünü sipariş edilemez. Sipariş, kalemler, stok düşümü ve koşul onayı
tek transaction'da yazılır. Sipariş durumu kalem durumlarından türetilir
(`deriveOrderStatus`). Kalem geçişleri `ITEM_TRANSITIONS` ile sınırlıdır.

### 4.3 Mal kabul
Üye teslim edilen kalem için teslimden sonraki 48 saat içinde sorun bildirir. Yönetim onaylarsa
KDV dahil bedel üyeye döner (ödenmişse karta iade, değilse borçtan düşüm) ve tedarikçinin payı aynı oranda azalır.

### 4.4 Gelir modeli (`computeRevenue`)
- **Komisyon:** kalem bazında `final_unit_price × qty × commission_bps`.
- **Abonelik:** Pro üyelik (aylık ₺1.490).
- **Finansman:** pazaryerinde vade farkı vadeyi taşıyan tedarikçiye gider (`FINANCING_FEE_TO_SUPPLIER`);
  standart modda fonlama ortağı payı (%60) düşüldükten sonra kalan kısmı.
- **Sponsorlu ürün:** tedarikçilerin öne çıkarma ücretleri.

### 4.5 Eşzamanlılık ve kilit sırası
Canlıda PostgreSQL istekleri paralel çalıştırır. Para ve stok tutarlılığı satır kilitleriyle korunur.
Tüm işlemler kilitleri **aynı sırayla** alır, böylece kilitlenme (deadlock) oluşmaz:

```
dalga (FOR SHARE / kapanışta FOR UPDATE) → üye (FOR NO KEY UPDATE) → teklifler (id sırasıyla) → kalem → sipariş
```

- Stok düşümü koşulludur (`stock >= qty`); stok asla eksiye düşmez.
- Üye satırı kilidi, aynı üyenin eşzamanlı siparişlerinde vadeli limitin iki kez harcanmasını engeller.
- Dalga kapanışı ile o anda gelen siparişler sıraya girer. Kapanıştan sonra gelen sipariş "dalga kapandı" yanıtı alır.
- Mal kabul onayı, Pro geçişi ve borç ödemesi koşullu güncelleme ya da kilitle tek seferliktir.
- `FOR NO KEY UPDATE`, yabancı anahtar kontrollerinin aldığı `KEY SHARE` kilidiyle çakışmaz.

Bu kurallar `npm run verify` ile gerçek PostgreSQL üzerinde eşzamanlı isteklerle test edilir.

### 4.6 Para akışı, iptal ve iade (`services/money-flow.ts`)
Tek hesap fonksiyonu `computeCharges` (core): kalem tutarı = KDV dahil bedel + vade farkı payı − onaylı mal
kabul iadesi; Havuz payı = komisyon (KDV hariç mal bedeli üzerinden) + %20 KDV'si; tedarikçi payı = kalan. Aynı
fonksiyon ödeme sepetini, ödenmemiş siparişin borcunu, ödenmiş siparişte iade edilecek farkı ve hakedişi
hesaplar. Sipariş değişince (`applyOrderChange`): ödenmemişse borç yeniden hesaplanır, ödenmişse kalem başına
ödenen − olması gereken farkı `refunds` tablosuna yazılır. `processRefunds` iadeyi önce "işleniyor"a alır
(atomik), sonra sağlayıcıya gönderir; ağ hatası artan aralıklarla denenir, iş kuralı reddi veya 10 dakikadan
uzun belirsiz kalan iade "elle kontrol" durumuna düşer ve yönetime bildirilir (çift iade riski yok).

### 4.7 Ödeme (`server/payments`, `services/payments.ts`)
Sağlayıcı arayüzü (`PaymentProvider`): `createCheckout`, `retrieve`, `refund`, `approveItem`, `upsertSubMerchant`.
Tutar ve sepet her zaman sunucuda hesaplanır; pazaryerinde sepet kalemi tedarikçinin `subMerchantKey` ve
`subMerchantPrice` değerlerini taşır. Sonuçtaki `itemTransactions` işlem numaraları iade ve onay için saklanır.
iyzico'da sonuç, kullanıcı dönüşündeki form verisine değil, sunucudan sunucuya `retrieve` ile doğrulanır;
ödenen tutar ve eşleşme kimliği kontrol edilir. Başarı işlemi idempotenttir (kilit sırası: sipariş → ödeme).
Para tahsil edilmiş ama karşılığı geçersizse (mükerrer ödeme, iptal edilmiş sipariş, zaten Pro) tutarın
tamamı karta iade edilir; hiçbir tahsilat yok sayılmaz. Peşin sipariş 30 dakika içinde ödenmezse iptal edilir.
Ödenmemiş sipariş tedarikçiye görünmez ve dalga kapanışında havuza girmez.

### 4.8 Ürün onayı ve hakediş (`services/money-flow.ts`, `services/settlements.ts`)
Teslim edilmiş, 48 saatlik itiraz süresi dolmuş, açık bildirimi ve bekleyen iadesi olmayan kalem serbest
bırakılır (`processReleases`): pazaryerinde iyzico'ya ürün onayı verilir (vadeli siparişte üye ödeyene kadar
beklenir) ve kalemin nihai tutarları dondurulur. Hakediş belgesi, dönem sonuna kadar serbest bırakılmış
kalemlerin dondurulmuş tutarlarından oluşur: `net = satış − iade − komisyon − komisyon KDV'si`. Kalemler
`settlement_id IS NULL` koşuluyla atomik sahiplenilir. iyzico kanalında ödemeyi iyzico yapar (belge komisyon
faturasının dayanağıdır); standart modda havale yapılır ve referansla işaretlenir.

### 4.9 Zamanlanmış bakım (`server/jobs.ts`)
İdempotent işler: ödeme süresi dolan siparişleri iptal eder, kapanış saati geçen dalgayı kapatıp farkları
üyelere döndürür, teslim tarihi geçen dalgayı "teslim edildi" yapar, vadesi geçen borcu "gecikmiş" işaretler, vade
ve dalga kapanış hatırlatmalarını gönderir, bekleyen karta iadeleri gönderir, itiraz süresi dolan kalemleri
serbest bırakır (ürün onayı), e-posta/WhatsApp kuyruğunu boşaltır. Tüm tarih hesapları Türkiye saatine
(Europe/Istanbul) göredir; sunucu UTC'de çalışsa da dalga kapanışı ve ay sınırları kaymaz. Uzun ömürlü sunucuda dakikada bir
kendiliğinden çalışır. Sunucusuz ortamda `GET /api/v1/cron/maintenance` uç noktası (`Authorization: Bearer $CRON_SECRET`)
zamanlanmış görevle çağrılır.

## 5. Güvenlik

- Oturum: HS256 JWT. Web'de `httpOnly` + `SameSite=Lax` çerez, mobilde `Authorization: Bearer`
  (giriş yanıtındaki `token`). Production'da `SESSION_SECRET` zorunludur.
- Yetki: her API uç noktası `route([roller], …)` ile sarılıdır. Servisler ayrıca kayıt sahipliğini
  kontrol eder (üye yalnızca kendi siparişini, tedarikçi yalnızca kendi kalemini görür).
  Middleware, `/uye`, `/tedarikci` ve `/yonetim` alanlarını role göre yönlendirir.
- Tüm girdiler zod şemalarıyla doğrulanır. Hatalar tek formatta döner: `{ error: { code, message } }`.
- Şifreler bcrypt ile saklanır. Girişte kullanıcı bulunamasa da hash karşılaştırması yapılır.
- Giriş: yalnızca başarısız denemeler sayılır (IP başına 50, hesap başına 8 deneme / 15 dk). IP adresi
  istemcinin değiştirebileceği başlıktan değil, güvenilir proxy değerinden okunur. Başvuru formu da sınırlıdır.
  Sınırlayıcı süreç içidir; çok sunuculu kurulumda aynı arayüzle Redis'e taşınmalıdır.
- Güvenlik başlıkları `next.config.mjs` içinde tanımlıdır.

## 6. Mobil uygulamaya geçiş

Mevcut mimari, mobil uygulamayı yalnızca bir arayüz katmanı olarak eklemeye göre tasarlandı.

```bash
cd havuz/apps
npx create-expo-app@latest mobile --template blank-typescript
```

`apps/mobile/package.json` bağımlılıklarına `"@havuz/core": "*"` ve `"@havuz/sdk": "*"` ile
`@tanstack/react-query`, `expo-secure-store`, `lucide-react-native` eklenir. Ardından `havuz/`
kökünde `npm install` çalıştırılır (npm workspaces yerel paketleri bağlar).

```tsx
// apps/mobile/src/api.ts
import * as SecureStore from 'expo-secure-store';
import { createHavuzClient } from '@havuz/sdk';

export const client = createHavuzClient({
  baseUrl: 'https://api.havuz.app',
  getToken: () => SecureStore.getItemAsync('havuz_token'),
});

// Girişte: const { token } = await client.auth.login({ email, password });
//          await SecureStore.setItemAsync('havuz_token', token);
```

```tsx
// Ekranlar web ile aynı hook'ları kullanır:
const { data } = useMemberDashboard();
const createOrder = useCreateOrder();
```

| Katman | Web | Mobil | Paylaşılan |
|---|---|---|---|
| İş kuralları | ✓ | ✓ | `@havuz/core` — %100 |
| API istemcisi ve önbellek | ✓ | ✓ | `@havuz/sdk` — %100 |
| Etiketler, renk ve hareket token'ları | ✓ | ✓ | `core/design/tokens`, `core/domain/labels` |
| Ekranlar | Next.js + Tailwind | React Native (NativeWind önerilir) | — |
| İkonlar | `lucide-react` | `lucide-react-native` (aynı adlar) | ikon adları token'larda |

Monorepo'da Metro'nun workspace paketlerini görmesi için `metro.config.js` içinde `watchFolders`
değerine `../../packages` eklenir.

Web uygulaması zaten PWA olarak ana ekrana eklenebilir. Mobil arayüz deseni (alt sekme çubuğu,
alttan açılan paneller, büyük dokunma hedefleri) native uygulamayla aynıdır.

## 7. Ölçekleme notları

- Analitik sorgular `itemFacts()` üzerinden çalışır ve demo ölçeğinde bellekte toplanır.
  Binlerce üyeye ulaşıldığında bu tek nokta materialized view'lara veya bir OLAP tablosuna taşınır.
- Dalga kapanışı tek transaction'dadır. Çok yüksek hacimde kuyruk tabanlı bir işe dönüştürülebilir.
- Bildirimler (WhatsApp Business API, e-posta) ve e-Fatura entegratörü servis katmanına adaptör
  olarak eklenir. Arayüzler `services/` altında tanımlanmalıdır.
- Next.js 14.2 kullanılıyor. Yayın öncesinde `npm audit` uyarıları için Next.js 15+ sürümüne
  yükseltme planlanmalıdır (React 19 ve `@react-three/fiber` v9 ile birlikte).
