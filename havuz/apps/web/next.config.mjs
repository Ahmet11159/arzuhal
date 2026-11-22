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
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
