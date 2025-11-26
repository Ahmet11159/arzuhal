import FAQSection from '@/components/common/FAQSection'
import Breadcrumbs from '@/components/common/Breadcrumbs'

export const metadata = {
  title: 'Sık Sorulan Sorular - ARZUHAL',
  description: 'ARZUHAL hakkında merak ettiğiniz soruların cevapları.',
}

export default function FAQPage() {
  const breadcrumbs = [
    { label: 'Ana Sayfa', href: '/' },
    { label: 'SSS', href: '/sss' },
  ]

  return (
    <div className="pt-20 px-4 sm:px-6 lg:px-8 min-h-screen bg-cream-50">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <FAQSection />
    </div>
  )
}


