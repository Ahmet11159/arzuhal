'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import Image from 'next/image'

interface BackgroundImage {
  imageUrl: string
  altText?: string
}

const values = [
  { title: 'Kalite', description: 'En yüksek standartlarda üretim', letter: 'K' },
  { title: 'Estetik', description: 'Zamansız ve zarif tasarım', letter: 'E' },
  { title: 'Güç', description: 'Dayanıklı ve güvenilir', letter: 'G' },
  { title: 'Zarafet', description: 'İnce detaylar ve mükemmellik', letter: 'Z' },
  { title: 'Özgünlük', description: 'Benzersiz ve özel koleksiyonlar', letter: 'Ö' },
]

export default function BrandMessage() {
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
      const res = await fetch(`/api/backgrounds?page=home&section=brand-message&t=${timestamp}`, {
        cache: 'no-store',
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success !== false && data.data && data.data.length > 0) {
          const bg = data.data[0]
          if (bg.isActive && bg.imageUrl) {
            setBackgroundImage({
              imageUrl: bg.imageUrl,
              altText: bg.altText || 'ARZUHAL Değerler',
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching background:', error)
    }
  }

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
          <div className="absolute inset-0 bg-cream-50/80"></div>
        </div>
      )}
      <div className="relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-6">
            Değerlerimiz
          </h2>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            ARZUHAL, her bir fincanında bu değerleri yansıtır.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          {values.map((value) => {
            const letter = value.letter || value.title[0]
            return (
              <div
                key={value.title}
                className="flex flex-col items-center group"
                aria-label={`${value.title}: ${value.description}`}
              >
                <motion.div
                  className="relative mb-4"
                  whileHover={{ rotate: [0, -5, 5, -5, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-gold-200 via-gold-100 to-cream-50 flex items-center justify-center shadow-depth-md group-hover:shadow-depth-lg premium-transition">
                    <span className="text-3xl md:text-4xl font-serif font-bold gradient-text">
                      {letter}
                    </span>
                  </div>
                  <motion.div
                    className="absolute -inset-1 rounded-full bg-gold-200/30 blur-md"
                    // initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1, scale: 1.2 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.div>
                <h3 className="text-lg md:text-xl font-serif font-semibold text-charcoal-900 mb-2 text-center">
                  {value.title}
                </h3>
                <p className="text-sm md:text-base text-charcoal-600 text-center max-w-[180px]">
                  {value.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
      </div>
    </section>
  )
}



