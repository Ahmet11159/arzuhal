import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-serif font-bold text-charcoal-900 mb-4">404</h1>
        <p className="text-xl text-charcoal-600 mb-8">Sayfa bulunamadı</p>
        <Link
          href="/"
          className="px-8 py-4 bg-charcoal-900 text-cream-50 font-medium premium-transition hover:bg-gold-500 hover:text-charcoal-900"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  )
}




