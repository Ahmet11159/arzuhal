'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Breadcrumbs from '@/components/common/Breadcrumbs'

interface SiteImage {
  key: string
  imageUrl: string
  altText?: string
}

export default function ConceptsPage() {
  const [siteImages, setSiteImages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Konseptler - ARZUHAL'
    fetchSiteImages()
  }, [])

  const fetchSiteImages = async () => {
    try {
      const res = await fetch('/api/site-images?location=concepts-page', {
        cache: 'no-store',
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success !== false && data.data) {
          const imagesMap: Record<string, string> = {}
          data.data.forEach((img: SiteImage) => {
            imagesMap[img.key] = img.imageUrl
          })
          setSiteImages(imagesMap)
        }
      }
    } catch (error) {
      console.error('Error fetching site images:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fotoğraf yolları - önce SiteImage API'sinden, yoksa fallback
  const getImagePath = (id: string, fallbackKey: string) => {
    // SiteImage API'sinden gelen görseli kullan
    if (siteImages[fallbackKey]) {
      return siteImages[fallbackKey]
    }
    
    // Fallback: statik dosya yolları
    const imageOptions = {
      hikayeler: [
        '/concepts/hikaye-konsepti-kapak.jpg',
        '/concepts/hikaye-konsepti.jpg',
        '/concepts/hikaye-kapak.jpg',
        '/concepts/konsept-hikaye.jpg',
        '/concepts/hikaye.jpg',
      ],
      kardeslik: [
        '/concepts/fincan-kardesligi-kapak.jpg',
        '/concepts/fincan-kardesligi.jpg',
        '/concepts/kardeslik-kapak.jpg',
        '/concepts/konsept-kardeslik.jpg',
        '/concepts/kardeslik.jpg',
      ],
    }
    return imageOptions[id as keyof typeof imageOptions]?.[0] || ''
  }

  const concepts = [
    {
      id: 'hikayeler',
      title: 'Hikaye Konsepti',
      description: 'Her hikayenin kendine özgü bir estetiği var. Fincanlarınızı seçin ve hikayeyi tamamlayın.',
      link: '/konseptler/hikayeler',
      imageKey: 'concept-hikaye-kapak', // SiteImage key
      image: getImagePath('hikayeler', 'concept-hikaye-kapak'),
      altImages: [
        '/concepts/hikaye-konsepti.jpg',
        '/concepts/hikaye-kapak.jpg',
        '/concepts/konsept-hikaye.jpg',
      ],
    },
    {
      id: 'kardeslik',
      title: 'Fincan Kardeşliği',
      description: 'Yakında...',
      link: '/konseptler/fincan-kardesligi',
      imageKey: 'concept-fincan-kardesligi-kapak', // SiteImage key
      image: getImagePath('kardeslik', 'concept-fincan-kardesligi-kapak'),
      altImages: [
        '/concepts/fincan-kardesligi.jpg',
        '/concepts/kardeslik-kapak.jpg',
        '/concepts/konsept-kardeslik.jpg',
      ],
    },
  ]

  const breadcrumbs = [
    { label: 'Ana Sayfa', href: '/' },
    { label: 'Konseptler', href: '/konseptler' },
  ]

  return (
    <div className="pt-20 px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-cream-50">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs items={breadcrumbs} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-6">
            Konseptler
          </h1>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            ARZUHAL'i benzersiz kılan özel deneyimler
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-stretch">
          {concepts.map((concept, index) => (
            <motion.div
              key={concept.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              layout
              className="h-full"
            >
              <motion.div
                whileHover={{ y: -12, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="h-full"
              >
                <Link href={concept.link} className="block group h-full">
                  <div className="glass-medium rounded-2xl overflow-hidden shadow-depth-lg hover:shadow-depth-xl premium-transition h-full flex flex-col">
                  <div className="relative h-72 md:h-80 bg-cream-200 flex-shrink-0">
                    {loading ? (
                      <div className="w-full h-full flex items-center justify-center text-charcoal-400">
                        <div className="animate-pulse text-sm">Yükleniyor...</div>
                      </div>
                    ) : concept.image ? (
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.4 }}
                        className="w-full h-full"
                      >
                        <Image
                          src={concept.image}
                          alt={concept.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover"
                          priority={index === 0}
                        onError={(e) => {
                          // Eğer fotoğraf yüklenemezse, alternatif isimleri dene
                          const target = e.target as HTMLImageElement
                          const currentSrc = target.src
                          const altImages = (concept as any).altImages || []
                          const allImages = [concept.image, ...altImages]
                          const currentIndex = allImages.findIndex(img => currentSrc.includes(img.split('/').pop() || ''))
                          
                          if (currentIndex >= 0 && currentIndex < allImages.length - 1) {
                            // Bir sonraki alternatifi dene
                            target.src = allImages[currentIndex + 1]
                          } else if (currentIndex === -1 && altImages.length > 0) {
                            // İlk alternatifi dene
                            target.src = altImages[0]
                          } else {
                            // Hiçbiri çalışmazsa görseli gizle
                            target.style.display = 'none'
                          }
                        }}
                        />
                      </motion.div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-charcoal-400">
                        <p className="text-sm">Kapak fotoğrafı ekleniyor...</p>
                      </div>
                    )}
                    {/* Modern overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/90 via-charcoal-900/50 to-transparent z-10"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-20">
                      <motion.h3
                        whileHover={{ x: 4 }}
                        className={`text-2xl md:text-3xl font-serif font-bold mb-2 premium-transition ${
                          concept.title === 'Hikaye Konsepti' 
                            ? 'text-gold-400 group-hover:text-gold-300' 
                            : 'text-cream-50 group-hover:text-gold-300'
                        }`}
                      >
                        {concept.title}
                      </motion.h3>
                      <p className="text-cream-200 text-base group-hover:text-cream-50 premium-transition">
                        {concept.description}
                      </p>
                    </div>
                  </div>
                  <div className="p-6 bg-white/80 backdrop-blur-sm flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <motion.span
                        whileHover={{ x: 4 }}
                        className="text-gold-600 font-medium group-hover:text-gold-500 premium-transition flex items-center gap-2"
                      >
                        Keşfet
                        <motion.svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          whileHover={{ x: 4 }}
                          transition={{ duration: 0.2 }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </motion.svg>
                      </motion.span>
                    </div>
                  </div>
                </div>
              </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

