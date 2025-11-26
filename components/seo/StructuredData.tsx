export default function StructuredData() {
  // Base URL - production'da environment variable'dan alınabilir
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arzuhal.com'
  
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ARZUHAL',
    description: 'Kalite, estetik, güç, zarafet ve özgünlük değerleriyle üretilen premium Türk kahve fincanları.',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    sameAs: [
      // Sosyal medya linkleri buraya eklenebilir
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: ['Turkish'],
    },
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ARZUHAL',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/urunler?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  )
}

