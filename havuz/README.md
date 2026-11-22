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

## Ortam değişkenleri (`apps/web/.env`)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `SESSION_SECRET` | geliştirmede sabit | Oturum JWT imzası. **Production'da en az 32 karakter zorunlu.** |
| `DATABASE_URL` | boş → PGlite | Doluysa PostgreSQL'e bağlanır (`postgres://…`). Migration'lar açılışta otomatik uygulanır. |
| `PGLITE_DIR` | `./.data/pglite` | Gömülü veritabanı klasörü. |
| `AUTO_SEED` | geliştirmede `true`, production'da `false` | Boş veritabanına demo verisi yüklensin mi? |

## Ne içeriyor?

**Açılış sayfası.** React Three Fiber ile 3D ağ sahnesi (merkezde havuz, çevresinde işletmeler ve
tedarikçiler, aralarında akan sipariş darbeleri), canlı dalga geri sayımı, gerçek fiyat motoruyla
çalışan etkileşimli kademe demosu, tasarruf hesaplayıcı, üyelik planları ve başvuru formu.

**İşletme paneli (`/uye`)**
- Özet: aylık harcama ve tasarruf, kategori dağılımı, emsal işletme fiyat karşılaştırması, açık dalga.
- Katalog: standart ürün kartları, aynı ürün için birden çok tedarikçi teklifi, kademe merdiveni, havuz ilerlemesi.
- Dalga: kademeye yakın ürünler, tek tıkla "eksik miktarı ekle", geçmiş dalga iadeleri.
- Sepet: tedarikçiye göre gruplama, peşin / 30 / 60 gün vade, kredi kullanımı, KDV ve vade farkı hesabı.
- Siparişler: durum zaman çizelgesi, "teslim aldım", fotoğraflı mal kabul sorunu bildirimi, tekrar sipariş.
- Hesap: kredi defteri, vadeli ödemeler, aylık konsolide fatura, Pro'ya geçiş.

**Tedarikçi paneli (`/tedarikci`).** Ciro, açık dalga talep tahmini, müşteriye göre gruplanmış
kalemler (onayla, sevk et, teslim edildi, iptal), fiyat, kademe ve stok düzenleme.

**Yönetim paneli (`/yonetim`).** İşlem hacmi ve büyüme, **platform gelir kırılımı** (komisyon,
abonelik, finansman, sponsorlu ürün), dalga açma ve kapatma (kademe iadelerinin otomatik yazılması),
üye risk tablosu, tedarikçi karnesi, mal kabul onayı ve başvurular.

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
