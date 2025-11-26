'use client'

import { useEffect } from 'react'
import { AlertCircle, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-cream-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <AlertCircle size={64} className="mx-auto text-gold-500 mb-4" />
          <h1 className="text-4xl font-serif font-bold text-charcoal-900 mb-4">
            Bir Hata Oluştu
          </h1>
          <p className="text-charcoal-600 mb-2">
            Üzgünüz, beklenmeyen bir hata oluştu.
          </p>
          {error.message && (
            <p className="text-sm text-charcoal-500 mt-2">
              {error.message}
            </p>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition"
          >
            Tekrar Dene
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-charcoal-900 text-charcoal-900 rounded-lg hover:bg-charcoal-900 hover:text-cream-50 premium-transition"
          >
            <Home size={18} />
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  )
}
