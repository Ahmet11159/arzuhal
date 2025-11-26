import ProductList from '@/components/products/ProductList'
import Breadcrumbs from '@/components/common/Breadcrumbs'

export const metadata = {
  title: 'Ürünler - ARZUHAL',
  description: 'Klasik ve konsept modellerden oluşan premium fincan koleksiyonumuzu keşfedin.',
  openGraph: {
    title: 'Ürünler - ARZUHAL',
    description: 'Klasik ve konsept modellerden oluşan premium fincan koleksiyonumuzu keşfedin.',
    type: 'website',
  },
}

async function getCategoryName(slug: string): Promise<string> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
    const res = await fetch(`${baseUrl}/api/categories?includeInactive=true`, {
      cache: 'no-store',
    })
    const data = await res.json()
    if (data.success) {
      const cat = data.data.find((c: any) => c.slug === slug)
      return cat ? cat.name : slug.charAt(0).toUpperCase() + slug.slice(1)
    }
  } catch (error) {
    console.error('Error fetching category name:', error)
  }
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { kategori?: string; q?: string }
}) {
  const category = searchParams.kategori || 'all'
  const searchQuery = searchParams.q || ''
  const categoryLabel = category === 'all' ? 'Tümü' : await getCategoryName(category)

  const breadcrumbs = [
    { label: 'Ana Sayfa', href: '/' },
    { label: 'Ürünler', href: '/urunler' },
  ]

  if (category !== 'all') {
    breadcrumbs.push({ label: categoryLabel, href: `/urunler?kategori=${category}` })
  }

  return (
    <div className="pt-20 px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-cream-50">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs items={breadcrumbs} />

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-4">
            {searchQuery ? `"${searchQuery}" için arama sonuçları` : 'Premium Fincan Koleksiyonu'}
          </h1>
          {searchQuery ? (
            <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
              Arama sonuçları gösteriliyor...
            </p>
          ) : (
            <>
              <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
                Klasik ve konsept modellerden oluşan özenle seçilmiş fincan koleksiyonumuzu keşfedin.
                Her fincan, kalite ve estetik değerlerimizi yansıtır.
              </p>
              <p className="text-base text-charcoal-500 max-w-2xl mx-auto mt-3">
                Tüm fincan paketlerimiz altılı set olarak sunulmaktadır.
              </p>
            </>
          )}
        </div>

        <ProductList category={category} searchQuery={searchQuery} />
      </div>
    </div>
  )
}



