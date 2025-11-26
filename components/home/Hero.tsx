'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { logger as loggerClient } from '@/lib/logger-client'

interface BackgroundImage {
  imageUrl: string
  altText?: string
}

export default function Hero() {
  const [backgroundImage, setBackgroundImage] = useState<BackgroundImage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBackground()
    
    // Development mode'da real-time updates'i devre dışı bırak (performans için)
    if (process.env.NODE_ENV === 'production') {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchBackground()
        }
      }
      
      const handleFocus = () => {
        fetchBackground()
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('focus', handleFocus)
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [])

  const fetchBackground = async () => {
    try {
      const timestamp = Date.now()
      const res = await fetch(`/api/backgrounds?page=home&section=hero&t=${timestamp}`, {
        cache: 'no-store',
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success !== false && data.data && data.data.length > 0) {
          const bg = data.data[0]
          if (bg.isActive && bg.imageUrl) {
            setBackgroundImage({
              imageUrl: bg.imageUrl,
              altText: bg.altText || 'ARZUHAL Premium Kahve Fincanları',
            })
          }
        }
      }
    } catch (error) {
      loggerClient.error('Error fetching background:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section 
      className="relative min-h-screen flex items-center justify-center pt-20 sm:pt-24 md:pt-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
      aria-label="Ana sayfa hero bölümü"
    >
      {/* Arka Plan - Dinamik görsel veya gradient */}
      {!loading && backgroundImage ? (
        <div className="absolute inset-0">
          <Image
            src={backgroundImage.imageUrl}
            alt={backgroundImage.altText || 'ARZUHAL Premium Kahve Fincanları'}
            fill
            priority
            className="object-cover"
            sizes="100vw"
            quality={90}
            loading="eager"
            fetchPriority="high"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal-900/40 via-charcoal-900/20 to-charcoal-900/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-cream-100/30 to-cream-50/50" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-cream-100 to-cream-50 opacity-50" />
      )}
      
      <div className="relative z-10 max-w-4xl mx-auto text-center w-full">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-serif font-bold gradient-text mb-4 sm:mb-6 drop-shadow-lg leading-tight">
          ARZUHAL
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-charcoal-700 mb-3 sm:mb-4 font-serif italic drop-shadow-md px-2">
          Premium Kahve Fincanları
        </p>
        <p className="text-base sm:text-lg md:text-xl text-charcoal-600 mb-8 sm:mb-10 md:mb-12 max-w-2xl mx-auto drop-shadow-sm px-4 leading-relaxed">
          Kalite, estetik, güç, zarafet ve özgünlük değerleriyle üretilen özel koleksiyonlar.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
          <Link
            href="/urunler"
            className="inline-block w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-charcoal-900 text-cream-50 font-medium rounded-lg shadow-depth-lg hover:shadow-depth-xl premium-transition hover:bg-gold-500 hover:text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 text-sm sm:text-base min-h-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Koleksiyonu keşfet sayfasına git"
          >
            Koleksiyonu Keşfet
          </Link>
          <Link
            href="/konseptler"
            className="inline-block w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-charcoal-900 text-charcoal-900 font-medium rounded-lg shadow-depth-md hover:shadow-depth-lg premium-transition hover:bg-charcoal-900 hover:text-cream-50 glass-medium focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 text-sm sm:text-base min-h-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Konseptler sayfasına git"
          >
            Konseptler
          </Link>
        </div>
      </div>
    </section>
  )
}

