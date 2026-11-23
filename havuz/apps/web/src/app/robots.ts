import type { MetadataRoute } from 'next';

/** Herkese açık sayfalar dizinlenir; paneller, ödeme ve API dizinlenmez. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? 'http://localhost:3100';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/uye', '/tedarikci', '/yonetim', '/odeme', '/api', '/sifre-degistir', '/sifre-sifirla', '/sifremi-unuttum'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
