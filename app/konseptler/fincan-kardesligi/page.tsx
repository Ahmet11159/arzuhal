'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowLeft } from 'lucide-react'
import Breadcrumbs from '@/components/common/Breadcrumbs'

export default function FincanKardesligiPage() {
  useEffect(() => {
    document.title = 'Fincan Kardeşliği - ARZUHAL'
  }, [])

  const breadcrumbs = [
    { label: 'Ana Sayfa', href: '/' },
    { label: 'Konseptler', href: '/konseptler' },
    { label: 'Fincan Kardeşliği', href: '/konseptler/fincan-kardesligi' },
  ]

  return (
    <div className="pt-20 px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-cream-50">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={breadcrumbs} />

        {/* Coming Soon Content */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gold-200 via-gold-100 to-cream-50 rounded-full mb-8 shadow-lg">
            <Sparkles size={48} className="text-gold-600" />
          </div>

          <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-6">
            Fincan Kardeşliği
          </h1>
          
          <div className="bg-white rounded-xl border border-charcoal-900/10 p-8 md:p-12 shadow-lg mb-8">
            <p className="text-xl text-charcoal-700 mb-4 font-medium">
              Yakında Sizlerle
            </p>
            <p className="text-lg text-charcoal-600 leading-relaxed mb-6">
              Fincan Kardeşliği konsepti için özel içerik ve işlevsellik geliştirilmektedir.
              Bu benzersiz deneyim için hazırlıklarımız devam ediyor.
            </p>
            <div className="flex items-center justify-center gap-2 text-gold-600">
              <Sparkles size={20} className="animate-pulse" />
              <span className="font-medium">Çok yakında...</span>
            </div>
          </div>

          <Link
            href="/konseptler"
            className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition font-medium"
          >
            <ArrowLeft size={18} />
            Konseptlere Dön
          </Link>
        </div>
      </div>
    </div>
  )
}
