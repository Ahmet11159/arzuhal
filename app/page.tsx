import Hero from '@/components/home/Hero'
import FeaturedCategories from '@/components/home/FeaturedCategories'
import FeaturedConcepts from '@/components/home/FeaturedConcepts'
import BrandMessage from '@/components/home/BrandMessage'
import TestimonialsSection from '@/components/common/TestimonialsSection'
import FAQSection from '@/components/common/FAQSection'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ARZUHAL - Premium Kahve Fincanları',
  description: 'Kalite, estetik, güç, zarafet ve özgünlük değerleriyle üretilen premium Türk kahve fincanları. Klasik ve konsept modellerden oluşan özenle seçilmiş fincan koleksiyonumuzu keşfedin.',
  keywords: ['kahve fincanı', 'premium fincan', 'Türk kahvesi', 'seramik fincan', 'ARZUHAL', 'konsept fincan', 'hikaye konsepti'],
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
}

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <BrandMessage />
      <FeaturedCategories />
      <FeaturedConcepts />
      <TestimonialsSection />
      <FAQSection />
    </div>
  )
}



