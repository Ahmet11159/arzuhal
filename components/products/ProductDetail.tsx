'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ShoppingCart, X, Info, Home, ChevronRight as ChevronRightIcon, Share2, Facebook, Twitter, Linkedin, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import TestimonialsSection from '@/components/common/TestimonialsSection'

interface Story {
  _id: string
  title: string
  description?: string
}

interface Product {
  _id: string
  name: string
  description: string
  category: string
  images: string[]
  price?: number // Klasik ürünler için tek fincan fiyatı
  setPrice?: number // Konsept ürünler için 6'lı takım fiyatı
  material: string
  dimensions: {
    height?: number
    width?: number
    depth?: number
    unit: string
  }
  collectionTags: string[]
  trendyolLink?: string
  suggestedPairings: Product[]
  storyId?: Story | string | null
  chapterNumber?: number
  chapterTitle?: string
}

export default function ProductDetail({ product }: { product: Product }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const images = product.images && product.images.length > 0 ? product.images : []
  
  const productUrl = typeof window !== 'undefined' ? `${window.location.origin}/urunler/${product._id}` : ''
  const shareText = `${product.name} - ARZUHAL Premium Kahve Fincanları`

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToImage = (index: number) => {
    setCurrentImageIndex(index)
  }

  // Swipe handlers for mobile
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    if (isLeftSwipe && images.length > 1) {
      nextImage()
    }
    if (isRightSwipe && images.length > 1) {
      prevImage()
    }
  }

  // Zoom handlers
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 1024) { // Sadece desktop'ta zoom
      setIsZoomed(!isZoomed)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isZoomed && window.innerWidth >= 1024) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setZoomPosition({ x, y })
    }
  }

  // Sosyal paylaşım fonksiyonları
  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`, '_blank')
  }

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`, '_blank')
  }

  const shareToLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}`, '_blank')
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(productUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          text: product.description,
          url: productUrl,
        })
      } catch (error) {
        // Kullanıcı paylaşımı iptal etti
      }
    } else {
      setShowShareMenu(!showShareMenu)
    }
  }

  return (
    <div className="pt-20 px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-cream-50">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-charcoal-600 flex-wrap">
              <li>
                <Link href="/" className="hover:text-gold-500 premium-transition flex items-center gap-1">
                  <Home size={16} />
                  Ana Sayfa
                </Link>
              </li>
              <li>
                <ChevronRightIcon size={16} className="text-charcoal-400" />
              </li>
              <li>
                <Link href="/urunler" className="hover:text-gold-500 premium-transition">
                  Ürünler
                </Link>
              </li>
              <li>
                <ChevronRightIcon size={16} className="text-charcoal-400" />
              </li>
              <li className="text-charcoal-900 font-medium line-clamp-1">{product.name}</li>
            </ol>
          </nav>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            {/* Main Image Carousel */}
            <div 
              className={`relative h-64 sm:h-80 md:h-96 lg:h-[600px] bg-cream-200 rounded-2xl overflow-hidden mb-4 group shadow-depth-md touch-pan-y ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onClick={handleImageClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setIsZoomed(false)}
            >
              {images.length > 0 ? (
                <>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentImageIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.5, ease: 'easeInOut' }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={images[currentImageIndex]}
                        alt={`${product.name} - Görsel ${currentImageIndex + 1}`}
                        fill
                        className={`object-cover premium-transition ${isZoomed ? 'scale-150' : 'scale-100'}`}
                        priority={currentImageIndex === 0}
                        loading={currentImageIndex === 0 ? "eager" : "lazy"}
                        quality={90}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        style={isZoomed ? {
                          transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                        } : {}}
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={prevImage}
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 glass-medium text-charcoal-900 p-2 sm:p-3 rounded-full shadow-depth-md opacity-70 sm:opacity-0 group-hover:opacity-100 premium-transition z-10 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
                        aria-label="Önceki görsel"
                        type="button"
                      >
                        <ChevronLeft size={20} className="sm:w-6 sm:h-6" aria-hidden="true" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={nextImage}
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 glass-medium text-charcoal-900 p-2 sm:p-3 rounded-full shadow-depth-md opacity-70 sm:opacity-0 group-hover:opacity-100 premium-transition z-10 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
                        aria-label="Sonraki görsel"
                        type="button"
                      >
                        <ChevronRight size={20} className="sm:w-6 sm:h-6" aria-hidden="true" />
                      </motion.button>

                      {/* Image Counter */}
                      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm z-10">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-charcoal-400">
                  Görsel Yok
                </div>
              )}
            </div>

            {/* Thumbnail Navigation */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => goToImage(index)}
                    className={`relative h-16 sm:h-20 md:h-24 bg-cream-200 rounded overflow-hidden border-2 premium-transition touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 ${
                      currentImageIndex === index
                        ? 'border-gold-500 shadow-lg scale-105'
                        : 'border-transparent hover:border-gold-300'
                    }`}
                    aria-label={`Görsel ${index + 1}'i göster`}
                    type="button"
                  >
                    <Image
                      src={image}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    {currentImageIndex === index && (
                      <div className="absolute inset-0 bg-gold-500/20" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {/* Kategori Etiketi */}
            <div className="mb-4">
              <Link
                href={`/urunler?kategori=${product.category}`}
                className="inline-block px-4 py-2 bg-gold-100 text-gold-700 rounded-full text-sm font-semibold hover:bg-gold-200 premium-transition"
                aria-label={`${product.category} kategorisindeki ürünleri görüntüle`}
              >
                {product.category === 'konsept' ? 'Konsept' : product.category === 'klasik' ? 'Klasik' : product.category}
              </Link>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-4">
              {product.name}
            </h1>
            <p className="text-base sm:text-lg text-charcoal-600 mb-6 sm:mb-8 leading-relaxed">
              {product.description}
            </p>

            {/* Konsept Ürünler İçin Özel Etiketler */}
            {product.category === 'konsept' && (
              <div className="mb-6 space-y-2">
                {product.storyId && (
                  typeof product.storyId === 'object' && product.storyId.title ? (
                    <div className="inline-block mr-2">
                      <span className="px-3 py-1.5 bg-charcoal-900/5 text-charcoal-700 text-sm font-medium rounded">
                        {product.storyId.title}
                      </span>
                    </div>
                  ) : null
                )}
                {product.chapterNumber && (
                  <div className="inline-block">
                    <span className="px-3 py-1.5 bg-cream-100 text-charcoal-600 text-sm font-medium rounded">
                      {product.chapterNumber}. Bölüm
                      {product.chapterTitle && ` – ${product.chapterTitle}`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Fiyat - Optimize Edilmiş */}
            {product.category === 'konsept' && product.setPrice ? (
              <div className="mb-6 sm:mb-8 p-4 bg-gold-50 rounded-lg border border-gold-200">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl sm:text-3xl font-bold text-charcoal-900">
                    {product.setPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-charcoal-600 mt-1">
                  6&apos;lı Takım Fiyatı
                </p>
                {product.price && (
                  <p className="text-xs text-charcoal-500 mt-1">
                    (Tek fincan: {product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺)
                  </p>
                )}
              </div>
            ) : product.price ? (
              <div className="mb-6 sm:mb-8 p-4 bg-cream-100 rounded-lg border border-charcoal-900/10">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl sm:text-3xl font-bold text-charcoal-900">
                    {product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-charcoal-600 mt-1">
                  Tek Fincan Fiyatı
                </p>
              </div>
            ) : (
              <div className="mb-6 sm:mb-8 p-4 bg-cream-100 rounded-lg border border-charcoal-900/10">
                <p className="text-sm text-charcoal-600 italic">
                  Fiyat bilgisi için lütfen iletişime geçin.
                </p>
              </div>
            )}

            {/* Trendyol Butonu - Optimize Edilmiş CTA */}
            <div className="mb-8 space-y-3">
              {product.trendyolLink && product.trendyolLink.trim() ? (
                <a
                  href={product.trendyolLink.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full px-6 sm:px-8 py-3 sm:py-4 bg-charcoal-900 text-cream-50 font-semibold rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900 shadow-depth-lg hover:shadow-depth-xl min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
                  aria-label="Trendyol'da satın al"
                >
                  <ShoppingCart size={20} className="sm:w-6 sm:h-6" aria-hidden="true" />
                  <span className="text-sm sm:text-base">Trendyol&apos;da Satın Al</span>
                </a>
              ) : (
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="flex items-center justify-center gap-3 w-full px-6 sm:px-8 py-3 sm:py-4 bg-charcoal-900 text-cream-50 font-semibold rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900 shadow-depth-lg hover:shadow-depth-xl min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
                  aria-label="Trendyol'da satın al bilgisi"
                >
                  <ShoppingCart size={20} className="sm:w-6 sm:h-6" aria-hidden="true" />
                  <span className="text-sm sm:text-base">Trendyol&apos;da Satın Al</span>
                </button>
              )}
              
              {/* Koleksiyonu İncele Linki */}
              <Link
                href="/urunler"
                className="flex items-center justify-center gap-2 w-full px-6 sm:px-8 py-3 sm:py-4 border-2 border-charcoal-900 text-charcoal-900 font-semibold rounded-lg premium-transition hover:bg-charcoal-900 hover:text-cream-50 glass-medium min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
                aria-label="Koleksiyonu incele"
              >
                <span className="text-sm sm:text-base">Koleksiyonu İncele</span>
              </Link>
            </div>

            <div className="space-y-6 mb-8">
              <div>
                <h3 className="text-lg sm:text-xl font-serif font-semibold text-charcoal-900 mb-2">Materyal</h3>
                <p className="text-base sm:text-lg text-charcoal-600">{product.material}</p>
              </div>

              {product.dimensions && (
                <div>
                  <h3 className="text-lg sm:text-xl font-serif font-semibold text-charcoal-900 mb-2">Boyutlar</h3>
                  <div className="text-charcoal-600">
                    {product.dimensions.height && (
                      <p>Yükseklik: {product.dimensions.height} {product.dimensions.unit}</p>
                    )}
                    {product.dimensions.width && (
                      <p>Genişlik: {product.dimensions.width} {product.dimensions.unit}</p>
                    )}
                    {product.dimensions.depth && (
                      <p>Derinlik: {product.dimensions.depth} {product.dimensions.unit}</p>
                    )}
                  </div>
                </div>
              )}

              {product.collectionTags && product.collectionTags.length > 0 && (
                <div>
                  <h3 className="text-lg sm:text-xl font-serif font-semibold text-charcoal-900 mb-2">Koleksiyon</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.collectionTags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {product.suggestedPairings && product.suggestedPairings.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl sm:text-2xl font-serif font-semibold text-charcoal-900 mb-4">
                  Önerilen Eşleşmeler
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {product.suggestedPairings.map((pairing: Product) => (
                    <Link
                      key={pairing._id}
                      href={`/urunler/${pairing._id}`}
                      className="block group"
                    >
                      <div className="bg-cream-100 rounded-lg overflow-hidden premium-hover">
                        <div className="relative h-32 bg-cream-200">
                          {pairing.images && pairing.images[0] ? (
                            <Image
                              src={pairing.images[0]}
                              alt={pairing.name}
                              fill
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="p-4">
                          <p className="font-medium text-charcoal-900 group-hover:text-gold-500 premium-transition">
                            {pairing.name}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bilgilendirme Modalı */}
      <AnimatePresence>
        {showInfoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowInfoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg max-w-md w-full p-8 shadow-xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gold-100 rounded-full">
                    <Info className="text-gold-600" size={24} />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-charcoal-900">
                    Ön Liste
                  </h3>
                </div>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="text-charcoal-400 hover:text-charcoal-900 premium-transition"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-charcoal-700 leading-relaxed">
                  Bu ürün henüz <span className="font-semibold text-charcoal-900">Trendyol'da satışta değil</span>.
                </p>
                <p className="text-charcoal-600 leading-relaxed">
                  Bu sitemizde <span className="font-semibold text-gold-600">ön liste</span> olarak görüntülenmektedir. 
                  Ürün Trendyol'da satışa çıktığında buradan satın alabileceksiniz.
                </p>
                <p className="text-sm text-charcoal-500 italic">
                  Yakında Trendyol'da olacak!
                </p>
              </div>

              <button
                onClick={() => setShowInfoModal(false)}
                className="w-full mt-6 px-6 py-3 bg-charcoal-900 text-cream-50 font-medium rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900"
              >
                Anladım
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

