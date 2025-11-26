'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import Image from 'next/image'

interface BackgroundImage {
  imageUrl: string
  altText?: string
}

export default function FeaturedCategories() {
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
      const res = await fetch(`/api/backgrounds?page=home&section=categories&t=${timestamp}`, {
        cache: 'no-store',
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success !== false && data.data && data.data.length > 0) {
          const bg = data.data[0]
          if (bg.isActive && bg.imageUrl) {
            setBackgroundImage({
              imageUrl: bg.imageUrl,
              altText: bg.altText || 'ARZUHAL Kategoriler',
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching background:', error)
    }
  }
  const categories = [
    {
      id: 'klasik',
      title: 'Klasik Modeller',
      description: 'Zamansız tasarımlar',
      image: '/placeholder-category-1.jpg',
    },
    {
      id: 'konsept',
      title: 'Konsept Modeller',
      description: 'Özel koleksiyonlar',
      image: '/placeholder-category-2.jpg',
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
            className="object-cover opacity-15"
            sizes="100vw"
            quality={75}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-cream-50/90 to-cream-50"></div>
        </div>
      )}
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-6">
            Kategoriler
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {categories.map((category) => (
            <div key={category.id}>
              <div>
                <Link 
                  href={`/urunler?kategori=${category.id}`} 
                  className="block group"
                  aria-label={`${category.title} kategorisini keşfet`}
                >
                  <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden shadow-depth-lg hover:shadow-depth-xl premium-transition">
                    {/* Modern gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-charcoal-800 via-charcoal-700 to-charcoal-900">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]"></div>
                    </div>
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/95 via-charcoal-900/60 to-transparent z-10" />
                    
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10 z-20">
                      <h3 className="text-3xl md:text-4xl font-serif font-bold text-cream-50 mb-3 group-hover:text-gold-300 premium-transition">
                        {category.title}
                      </h3>
                      <p className="text-cream-200 text-lg group-hover:text-cream-50 premium-transition mb-4">
                        {category.description}
                      </p>
                      <div className="inline-flex items-center text-gold-400 font-medium">
                        Keşfet
                        <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Decorative elements */}
                    <div className="absolute top-6 right-6 w-24 h-24 bg-gold-400/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-6 left-6 w-32 h-32 bg-cream-50/5 rounded-full blur-3xl"></div>
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

