import StoriesList from '@/components/stories/StoriesList'
import Breadcrumbs from '@/components/common/Breadcrumbs'

export const metadata = {
  title: 'Hikayeler - ARZUHAL',
  description: 'Her hikayenin kendine özgü bir estetiği var. Fincanlarınızı seçin ve hikayeyi tamamlayın.',
  openGraph: {
    title: 'Hikayeler - ARZUHAL',
    description: 'Her hikayenin kendine özgü bir estetiği var. Fincanlarınızı seçin ve hikayeyi tamamlayın.',
    type: 'website',
  },
}

export default function StoriesPage() {
  const breadcrumbs = [
    { label: 'Ana Sayfa', href: '/' },
    { label: 'Konseptler', href: '/konseptler' },
    { label: 'Hikayeler', href: '/konseptler/hikayeler' },
  ]

  return (
    <div className="pt-20 px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-cream-50">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs items={breadcrumbs} />

        {/* Page Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-6">
            Hikaye Konsepti
          </h1>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            Her hikayenin kendine özgü bir estetiği var. Fincanlarınızı seçin ve hikayeyi tamamlayın.
            Her bölüm, size özel bir deneyim sunar.
          </p>
        </div>

        <StoriesList />
      </div>
    </div>
  )
}

