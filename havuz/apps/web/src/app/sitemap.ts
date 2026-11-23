import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? 'http://localhost:3100';
  const paths = ['', '/hakkimizda', '/iletisim', '/kullanim-kosullari', '/satis-sozlesmesi', '/iptal-iade', '/kvkk', '/gizlilik', '/giris'];
  return paths.map((p) => ({ url: `${base}${p}`, changeFrequency: p ? 'monthly' : 'weekly', priority: p ? 0.5 : 1 }));
}
