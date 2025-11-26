# ARZUHAL - Premium Kahve Fincanları Website

ARZUHAL, premium Türk kahve fincanları için geliştirilmiş profesyonel bir website projesidir.

## 🚀 Özellikler

- **Premium Tasarım**: Modern, minimalist ve lüks kullanıcı arayüzü
- **Ürün Yönetimi**: Klasik ve konsept modeller için tam özellikli ürün sayfaları
- **Hikaye Konsepti**: Kullanıcıların belirli sayıda fincan seçerek hikayeyi tamamladığı özel deneyim
- **Admin Paneli**: Ürün, hikaye, kategori, duyuru, FAQ, referans ve iletişim mesajları yönetimi
- **Responsive Tasarım**: Tüm cihazlarda mükemmel görünüm
- **SEO Optimizasyonu**: Sitemap, robots.txt, structured data, meta tags
- **Email Entegrasyonu**: Otomatik yanıt ve admin yanıt sistemi (Nodemailer/SendGrid)
- **Analytics Desteği**: Google Analytics ve Google Tag Manager entegrasyonu
- **Data Export**: Admin panelinden CSV/JSON export özelliği

## 🛠️ Teknolojiler

- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS**
- **MongoDB** / **Mongoose**
- **Framer Motion** (Animasyonlar)
- **JWT** (Authentication)
- **Lucide React** (Icons)

## 📦 Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. `.env.local` dosyası oluşturun:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/arzuhal
# veya MongoDB Atlas için:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/arzuhal

# JWT Secret
JWT_SECRET=your-secret-key-here

# Site URL (Production için)
NEXT_PUBLIC_SITE_URL=https://arzuhal.com

# Email Configuration (Optional)
EMAIL_PROVIDER=none # 'none', 'nodemailer', 'sendgrid'
# Nodemailer için:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-password
# SMTP_FROM=noreply@arzuhal.com
# SendGrid için:
# SENDGRID_API_KEY=your-api-key
# SENDGRID_FROM_EMAIL=noreply@arzuhal.com

# Analytics (Optional)
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
# NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

3. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

4. Tarayıcıda [http://localhost:3001](http://localhost:3001) adresini açın.

## 📁 Proje Yapısı

```
arzuhal/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── admin/             # Admin paneli
│   ├── konseptler/        # Konsept sayfaları
│   ├── urunler/           # Ürün sayfaları
│   ├── sitemap.ts         # Sitemap generator
│   └── robots.ts          # Robots.txt generator
├── components/            # React bileşenleri
│   ├── admin/            # Admin paneli bileşenleri
│   ├── analytics/        # Analytics component'leri
│   ├── common/           # Ortak bileşenler
│   ├── home/             # Ana sayfa bileşenleri
│   ├── layout/           # Layout bileşenleri
│   ├── products/         # Ürün bileşenleri
│   └── stories/          # Hikaye bileşenleri
├── lib/                  # Yardımcı fonksiyonlar
│   ├── analytics.ts     # Analytics utilities
│   ├── api-response.ts   # Standardized API responses
│   ├── auth.ts          # Authentication
│   ├── email-helper.ts  # Email utilities (optional)
│   ├── export.ts        # Data export utilities
│   ├── logger.ts        # Logging utilities
│   └── mongodb.ts       # MongoDB connection
├── models/              # Mongoose modelleri
├── public/              # Statik dosyalar
│   └── uploads/         # Yüklenen görseller
└── types/              # TypeScript type definitions
```

## 🔐 Admin Paneli

Admin paneline `/admin` adresinden erişebilirsiniz. Varsayılan admin bilgileri `.env.local` dosyasında tanımlanmalıdır.

## 📝 Geliştirme Notları

- **Email Paketleri**: Email göndermek için `nodemailer` veya `@sendgrid/mail` paketlerinden birini yükleyin (opsiyonel)
- **Analytics**: Google Analytics veya GTM kullanmak için environment variable'ları ayarlayın
- **Uploads**: Görseller `public/uploads` klasörüne kaydedilir (gitignore'da)

## 🚀 Production Deployment

1. Environment variable'ları production ortamında ayarlayın
2. MongoDB bağlantısını kontrol edin
3. Build alın: `npm run build`
4. Start: `npm start`

## 📄 Lisans

Bu proje özel bir projedir.

## 👥 Katkıda Bulunanlar

- ARZUHAL Development Team

---

**Son Güncelleme**: 2025-01-27
