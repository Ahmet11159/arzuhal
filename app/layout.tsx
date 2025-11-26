import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ClientProviders from '@/components/providers/ClientProviders'
import StructuredData from '@/components/seo/StructuredData'
import AnnouncementBanner from '@/components/common/AnnouncementBanner'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ARZUHAL - Premium Kahve Fincanları',
  description: 'Kalite, estetik, güç, zarafet ve özgünlük değerleriyle üretilen premium Türk kahve fincanları.',
  keywords: ['kahve fincanı', 'premium fincan', 'Türk kahvesi', 'seramik fincan', 'ARZUHAL'],
  authors: [{ name: 'ARZUHAL' }],
  openGraph: {
    title: 'ARZUHAL - Premium Kahve Fincanları',
    description: 'Kalite, estetik, güç, zarafet ve özgünlük değerleriyle üretilen premium Türk kahve fincanları.',
    type: 'website',
    locale: 'tr_TR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ARZUHAL - Premium Kahve Fincanları',
    description: 'Kalite, estetik, güç, zarafet ve özgünlük değerleriyle üretilen premium Türk kahve fincanları.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <StructuredData />
        <GoogleAnalytics />
      </head>
      <body>
        <ClientProviders>
          <AnnouncementBanner />
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
        </ClientProviders>
      </body>
    </html>
  )
}


