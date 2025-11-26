'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import Image from 'next/image'

interface BackgroundImage {
  imageUrl: string
  altText?: string
}

export default function FeaturedConcepts() {
  const [backgroundImage, setBackgroundImage] = useState<BackgroundImage | null>(null)

  useEffect(() => {
    fetchBackground()
    
    // Development mode'da real-time updates'i devre dışı bırak (performans için)
    if (process.env.NODE_ENV === 'production') {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchBackground()
        }
      }
      
      window.addEventListener('visibilitychange', handleVisibilityChange)
      return () => window.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const fetchBackground = async () => {
    try {
      const timestamp = Date.now()
      const res = await fetch(`/api/backgrounds?page=home&section=concepts&t=${timestamp}`, {
        cache: 'no-store',
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success !== false && data.data && data.data.length > 0) {
          const bg = data.data[0]
          if (bg.isActive && bg.imageUrl) {
            setBackgroundImage({
              imageUrl: bg.imageUrl,
              altText: bg.altText || 'ARZUHAL Konseptler',
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching background:', error)
    }
  }
  const concepts = [
    {
      id: 'hikayeler',
      title: 'Hikaye Konsepti',
      description: 'Her hikayenin kendine özgü bir estetiği var. Fincanlarınızı seçin ve hikayeyi tamamlayın.',
      link: '/konseptler/hikayeler',
    },
    {
      id: 'kardeslik',
      title: 'Fincan Kardeşliği',
      description: 'Yakında...',
      link: '/konseptler/fincan-kardesligi',
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src={backgroundImage.imageUrl}
            alt={backgroundImage.altText || 'ARZUHAL'}
            fill
            className="object-cover opacity-20"
            sizes="100vw"
            quality={75}
          />
          <div className="absolute inset-0 bg-cream-100/85"></div>
        </div>
      )}
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-6">
            Konseptler
          </h2>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            ARZUHAL&apos;i benzersiz kılan özel deneyimler
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {concepts.map((concept) => (
            <div key={concept.id} className="h-full">
              <div className="h-full">
                <Link 
                  href={concept.link} 
                  className="block group h-full"
                  aria-label={`${concept.title} konseptini keşfet`}
                >
                  <div className="glass-medium p-8 rounded-2xl shadow-depth-md hover:shadow-depth-lg premium-transition h-full flex flex-col">
                    <h3 className="text-2xl font-serif font-bold gradient-text mb-4 premium-transition">
                      {concept.title}
                    </h3>
                    <p className="text-charcoal-600 mb-6 flex-1 leading-relaxed">
                      {concept.description}
                    </p>
                    <span className="text-gold-600 font-medium inline-flex items-center gap-2">
                      Keşfet
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

