const dev = process.env.NODE_ENV !== 'production';

/**
 * İçerik güvenlik politikası: kod yalnızca kendi alan adımızdan yüklenir, site başka sitelerin
 * çerçevesine gömülemez, form yalnızca kendimize gönderilir. Ödeme, iyzico'nun kendi sayfasına
 * yönlendirilerek yapıldığı için iyzico betiği sitemize yüklenmez. (Geliştirmede hızlı yenileme
 * için 'unsafe-eval' gerekir.)
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@havuz/core', '@havuz/sdk', 'geist'],
  experimental: {
    // PGlite WASM dosyaları paketlenmemeli; Node tarafından doğrudan yüklenir.
    serverComponentsExternalPackages: ['@electric-sql/pglite', 'pg'],
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
          // Yalnızca HTTPS üzerinden açılan sitede etkilidir; tarayıcı 2 yıl boyunca yalnızca HTTPS kullanır.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
