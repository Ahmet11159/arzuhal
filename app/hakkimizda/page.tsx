'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Award, Heart, Sparkles, Users } from 'lucide-react'
import Breadcrumbs from '@/components/common/Breadcrumbs'
import type { Metadata } from 'next'

// Metadata için ayrı bir export (Next.js 14 App Router'da client component'lerde metadata export edilemez)
// Bu yüzden metadata'yı parent layout'ta veya ayrı bir server component'te tanımlamak gerekir
// Şimdilik document.title kullanılıyor

interface SiteImage {
  key: string
  imageUrl: string
  altText?: string
}

interface AboutContent {
  title?: string
  subtitle?: string
  mainContent?: string
  mission?: string
  vision?: string
  values?: Array<{ title: string; description: string; icon: string; letter?: string }>
}

export default function AboutPage() {
  const [images, setImages] = useState<Record<string, string>>({})
  const [backgroundImage, setBackgroundImage] = useState<{ imageUrl: string; altText?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Hakkımızda - ARZUHAL'
    fetchAboutImages()
    fetchBackground()
    
    // Development mode'da real-time updates'i devre dışı bırak (performans için)
    if (process.env.NODE_ENV === 'production') {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchAboutImages()
          fetchBackground()
        }
      }
      
      const handleFocus = () => {
        fetchAboutImages()
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

  const fetchAboutImages = async () => {
    try {
      const res = await fetch('/api/site-images?location=about-section', {
        cache: 'no-store',
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success !== false && data.data) {
          const imagesMap: Record<string, string> = {}
          data.data.forEach((img: SiteImage) => {
            imagesMap[img.key] = img.imageUrl
          })
          setImages(imagesMap)
        }
      }
    } catch (error) {
      console.error('Error fetching about images:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBackground = async () => {
    try {
      const timestamp = Date.now()
      const res = await fetch(`/api/backgrounds?page=about&section=main&t=${timestamp}`, {
        cache: 'no-store',
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success !== false && data.data && data.data.length > 0) {
          const bg = data.data[0]
          if (bg.isActive && bg.imageUrl) {
            setBackgroundImage({
              imageUrl: bg.imageUrl,
              altText: bg.altText || 'ARZUHAL Hakkımızda',
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching background:', error)
    }
  }

  // Varsayılan değerler - gelecekte admin panelinden yönetilebilir
  const aboutContent: AboutContent = {
    title: 'Hakkımızda',
    subtitle: 'ARZUHAL Hikayesi',
    mainContent: `ARZUHAL, premium Türk kahve fincanları üreten bir marka olarak, geleneksel zanaatkarlığı modern tasarımla buluşturuyor. Her fincanımız, kalite, estetik, güç, zarafet ve özgünlük değerlerimizi yansıtır.`,
    mission: `Misyonumuz, her fincanın bir hikayesi olduğuna inanarak, müşterilerimize sadece bir ürün değil, bir deneyim sunmaktır.`,
    vision: `Vizyonumuz, Türk kahve kültürünü dünyaya tanıtmak ve her fincanla unutulmaz anılar yaratmaktır.`,
    values: [
      {
        title: 'Kalite',
        description: 'En yüksek standartlarda üretim',
        icon: 'K',
        letter: 'K',
      },
      {
        title: 'Estetik',
        description: 'Zamansız ve zarif tasarım',
        icon: 'E',
        letter: 'E',
      },
      {
        title: 'Güç',
        description: 'Dayanıklı ve güvenilir',
        icon: 'G',
        letter: 'G',
      },
      {
        title: 'Zarafet',
        description: 'İnce detaylar ve mükemmellik',
        icon: 'Z',
        letter: 'Z',
      },
      {
        title: 'Özgünlük',
        description: 'Benzersiz ve özel koleksiyonlar',
        icon: 'Ö',
        letter: 'Ö',
      },
    ],
  }

  const iconMap: Record<string, any> = {
    Award,
    Sparkles,
    Heart,
    Users,
  }

  const breadcrumbs = [
    { label: 'Ana Sayfa', href: '/' },
    { label: 'Hakkımızda', href: '/hakkimizda' },
  ]

  return (
    <div className="pt-20 px-4 sm:px-6 lg:px-8 py-12 min-h-screen relative">
      {/* Arka Plan Görseli */}
      {backgroundImage && (
        <div className="fixed inset-0 z-0">
          <Image
            src={backgroundImage.imageUrl}
            alt={backgroundImage.altText || 'ARZUHAL Hakkımızda'}
            fill
            className="object-cover opacity-20"
            sizes="100vw"
            quality={75}
            priority={false}
          />
          <div className="absolute inset-0 bg-cream-50/85"></div>
        </div>
      )}
      <div className="max-w-6xl mx-auto relative z-10">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-6">
            {aboutContent.title}
          </h1>
          <p className="text-xl text-charcoal-600 max-w-3xl mx-auto">
            {aboutContent.subtitle}
          </p>
        </motion.div>

        {/* Main Image */}
        {images['about-hero'] && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-96 md:h-[500px] rounded-2xl overflow-hidden mb-16 shadow-depth-lg"
          >
            <Image
              src={images['about-hero']}
              alt={aboutContent.title || 'ARZUHAL Hakkımızda'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 80vw"
              priority
            />
          </motion.div>
        )}

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <div className="glass-medium rounded-2xl p-8 md:p-12 shadow-depth-md">
            <p className="text-lg text-charcoal-700 leading-relaxed mb-6">
              {aboutContent.mainContent}
            </p>
            
            {aboutContent.mission && (
              <div className="mb-6">
                <h2 className="text-2xl font-serif font-semibold text-charcoal-900 mb-3">
                  Misyonumuz
                </h2>
                <p className="text-charcoal-600 leading-relaxed">
                  {aboutContent.mission}
                </p>
              </div>
            )}

            {aboutContent.vision && (
              <div>
                <h2 className="text-2xl font-serif font-semibold text-charcoal-900 mb-3">
                  Vizyonumuz
                </h2>
                <p className="text-charcoal-600 leading-relaxed">
                  {aboutContent.vision}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Values Grid */}
        {aboutContent.values && aboutContent.values.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-16"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-charcoal-900 mb-4">
                Değerlerimiz
              </h2>
              <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
                ARZUHAL, her bir fincanında bu değerleri yansıtır.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
              {aboutContent.values.map((value, index) => {
                const letter = (value as any).letter || value.title[0]
                return (
                  <motion.div
                    key={value.title}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.1, y: -8 }}
                    whileTap={{ scale: 0.95 }}
                    layout
                    className="flex flex-col items-center group"
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
                        initial={{ opacity: 0 }}
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
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Additional Images */}
        {(images['about-image-1'] || images['about-image-2']) && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {images['about-image-1'] && (
              <div className="relative h-64 rounded-lg overflow-hidden shadow-lg">
                <Image
                  src={images['about-image-1']}
                  alt="ARZUHAL"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            )}
            {images['about-image-2'] && (
              <div className="relative h-64 rounded-lg overflow-hidden shadow-lg">
                <Image
                  src={images['about-image-2']}
                  alt="ARZUHAL"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

