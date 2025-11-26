'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import EmptyState from '@/components/common/EmptyState'
import { ProductCardSkeleton } from '@/components/common/SkeletonLoader'
import { ShoppingCart, X, Info } from 'lucide-react'
import { logger as loggerClient } from '@/lib/logger-client'
import { API_ROUTES } from '@/lib/constants'

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
  trendyolLink?: string
  storyId?: Story | string | null // Populate edilmiş hikaye bilgisi
  chapterNumber?: number // Bölüm numarası
  chapterTitle?: string // Bölüm başlığı
}

export default function ProductList({ category, searchQuery = '' }: { category: string; searchQuery?: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [categories, setCategories] = useState<Array<{ _id: string; name: string; slug: string; isActive?: boolean; order?: number }>>([])
  const [visibleCount, setVisibleCount] = useState(12) // İlk 12 ürünü göster
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(API_ROUTES.CATEGORIES, {
          cache: 'no-store',
        })
        const data = await res.json()
        if (data.success) {
          setCategories(data.data || [])
        }
      } catch (error) {
        loggerClient.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    async function fetchProducts() {
      try {
        const params = new URLSearchParams()
        if (category !== 'all') {
          params.append('category', category)
        }
        if (searchQuery) {
          params.append('search', searchQuery)
        }
        const url = params.toString() 
          ? `${API_ROUTES.PRODUCTS}?${params.toString()}`
          : API_ROUTES.PRODUCTS
        // Cache'i bypass et - her zaman güncel veriyi al
        const res = await fetch(url, {
          cache: 'no-store',
        })
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        
        const data = await res.json()
        
        // Yeni standardize edilmiş API formatı
        if (data.success === false || data.error) {
          loggerClient.error('API Error:', data.error)
          setError(data.message || data.error || 'Ürünler yüklenirken bir hata oluştu')
          setProducts([])
        } else {
          setError(null)
          // Yeni format: { success: true, data: [...] } veya eski format: [...]
          setProducts(data.data || data)
        }
      } catch (error: any) {
        loggerClient.error('Error fetching products:', error)
        setError('Ürünler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.')
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [category, searchQuery])

  // Filtrelenmiş ve sıralanmış kategoriler - useMemo ile optimize edildi
  const activeCategories = useMemo(() => {
    return categories
      .filter((cat: any) => cat.isActive !== false)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  }, [categories])

  // Kategori ismini slug'dan bul - useCallback ile optimize edildi
  const getCategoryName = useCallback((slug: string) => {
    const cat = categories.find((c) => c.slug === slug)
    return cat ? cat.name : slug.charAt(0).toUpperCase() + slug.slice(1)
  }, [categories])

  // Infinite scroll için görünür ürünleri filtrele
  const visibleProducts = useMemo(() => {
    return products.slice(0, visibleCount)
  }, [products, visibleCount])

  // Daha fazla yükle
  const loadMore = useCallback(() => {
    if (visibleCount < products.length && !isLoadingMore) {
      setIsLoadingMore(true)
      // Smooth scroll için kısa bir delay
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + 12, products.length))
        setIsLoadingMore(false)
      }, 300)
    }
  }, [visibleCount, products.length, isLoadingMore])

  // Scroll event listener - infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore])

  // Kategori veya arama sorgusu değiştiğinde görünür sayıyı sıfırla
  useEffect(() => {
    setVisibleCount(12)
  }, [category, searchQuery])

  if (loading) {
    return (
      <div>
        {/* Kategori Filtreleme Butonları - Loading State */}
        <div className="flex flex-wrap gap-4 mb-8 justify-center">
          <Link
            href="/urunler"
            className="px-6 py-2 bg-white text-charcoal-900 border border-charcoal-900/20 rounded-lg premium-transition"
          >
            Tümü
          </Link>
          {/* Kategoriler yüklenene kadar placeholder göster */}
          {categories.length === 0 ? (
            <div className="px-6 py-2 bg-cream-100 text-charcoal-400 border border-charcoal-900/10 rounded-lg animate-pulse">
              ...
            </div>
          ) : (
            categories
              .filter((cat) => cat.isActive !== false)
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
              .map((cat) => (
                <Link
                  key={cat._id}
                  href={`/urunler?kategori=${cat.slug}`}
                  className="px-6 py-2 bg-white text-charcoal-900 border border-charcoal-900/20 rounded-lg premium-transition"
                >
                  {cat.name}
                </Link>
              ))
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 premium-transition"
        >
          Sayfayı Yenile
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Kategori Filtreleme Butonları - Optimize Edilmiş */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center items-center">
          <span className="text-sm font-medium text-charcoal-700 mb-2 sm:mb-0 w-full sm:w-auto text-center sm:text-left">
            Kategori:
          </span>
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
            <Link
              href="/urunler"
              className={`px-4 sm:px-6 py-2 premium-transition rounded-lg min-h-[44px] flex items-center justify-center touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 text-sm sm:text-base ${
                category === 'all'
                  ? 'bg-charcoal-900 text-cream-50 shadow-depth-md'
                  : 'bg-white text-charcoal-900 border border-charcoal-900/20 hover:bg-charcoal-900 hover:text-cream-50 hover:shadow-depth-sm'
              }`}
              aria-label="Tüm ürünleri göster"
              aria-current={category === 'all' ? 'page' : undefined}
            >
              Tümü
            </Link>
            {activeCategories.map((cat) => (
              <Link
                key={cat._id}
                href={`/urunler?kategori=${cat.slug}`}
                className={`px-4 sm:px-6 py-2 premium-transition rounded-lg min-h-[44px] flex items-center justify-center touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 text-sm sm:text-base ${
                  category === cat.slug
                    ? 'bg-charcoal-900 text-cream-50 shadow-depth-md'
                    : 'bg-white text-charcoal-900 border border-charcoal-900/20 hover:bg-charcoal-900 hover:text-cream-50 hover:shadow-depth-sm'
                }`}
                aria-label={`${cat.name} kategorisindeki ürünleri göster`}
                aria-current={category === cat.slug ? 'page' : undefined}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Ürün Listesi veya Boş Durum */}
      {products.length === 0 ? (
        <EmptyState
          icon="package"
          title="Henüz ürün bulunmamaktadır"
          description={
            category === 'all'
              ? 'Şu anda gösterilecek ürün bulunmuyor.'
              : `${getCategoryName(category)} kategorisinde henüz ürün bulunmuyor.`
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleProducts.map((product, index) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            layout
          >
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="glass-medium rounded-2xl overflow-hidden shadow-depth-md hover:shadow-depth-lg premium-transition h-full flex flex-col">
                <Link href={`/urunler/${product._id}`} className="block group flex-1 flex flex-col">
                  <div className="relative h-48 sm:h-56 md:h-64 bg-cream-200 overflow-hidden flex-shrink-0">
                    {product.images && product.images[0] ? (
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.4 }}
                        className="w-full h-full"
                      >
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-cover"
                          loading="lazy"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </motion.div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-charcoal-400">
                        Görsel Yok
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-6 flex-1 flex flex-col">
                    {/* Konsept Ürünler İçin Özel Etiketler */}
                  {product.category === 'konsept' && (
                    <div className="mb-3 space-y-1.5">
                      {/* Konsept Etiketi */}
                      <div className="inline-block">
                        <span className="px-2.5 py-1 bg-gold-100 text-gold-700 text-xs font-semibold rounded-full uppercase tracking-wide">
                          Hikaye Konsepti
                        </span>
                      </div>
                      
                      {/* Hikaye Serisi Etiketi */}
                      {product.storyId && (
                        typeof product.storyId === 'object' && product.storyId.title ? (
                          <div className="block">
                            <span className="px-2.5 py-1 bg-charcoal-900/5 text-charcoal-700 text-xs font-medium rounded">
                              {product.storyId.title}
                            </span>
                          </div>
                        ) : typeof product.storyId === 'string' ? (
                          <div className="block">
                            <span className="px-2.5 py-1 bg-charcoal-900/5 text-charcoal-700 text-xs font-medium rounded">
                              Hikaye ID: {product.storyId}
                            </span>
                          </div>
                        ) : null
                      )}
                      
                      {/* Bölüm Etiketi */}
                      {product.chapterNumber && (
                        <div className="block">
                          <span className="px-2.5 py-1 bg-cream-100 text-charcoal-600 text-xs font-medium rounded">
                            {product.chapterNumber}. Bölüm
                            {product.chapterTitle && ` – ${product.chapterTitle}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Ürün Adı */}
                  <motion.h3
                    whileHover={{ x: 2 }}
                    className="text-lg sm:text-xl font-serif font-semibold gradient-text mb-2 premium-transition"
                  >
                    {product.name}
                  </motion.h3>
                  
                  {/* Ürün Açıklaması */}
                  <p className="text-sm text-charcoal-600 mb-4 line-clamp-2 flex-1">
                    {product.description}
                  </p>
                  
                  {/* Fiyat */}
                  {product.category === 'konsept' && product.setPrice ? (
                    <div className="mb-3">
                      <p className="text-lg font-semibold text-charcoal-900">
                        {product.setPrice.toLocaleString('tr-TR')} ₺
                      </p>
                      <p className="text-xs text-charcoal-500 mt-1">
                        6&apos;lı Takım
                      </p>
                    </div>
                  ) : product.price ? (
                    <p className="text-lg font-semibold text-charcoal-900 mb-3">
                      {product.price.toLocaleString('tr-TR')} ₺
                    </p>
                  ) : null}
                  </div>
                </Link>
              
                    {/* Trendyol Butonu - Optimize Edilmiş CTA */}
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex-shrink-0">
                      {product.trendyolLink && product.trendyolLink.trim() ? (
                        <a
                          href={product.trendyolLink.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-charcoal-900 text-cream-50 font-medium rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900 shadow-depth-md hover:shadow-depth-lg min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 text-sm sm:text-base"
                          aria-label="Trendyol'da satın al"
                        >
                          <ShoppingCart size={18} aria-hidden="true" />
                          <span>Trendyol&apos;da Satın Al</span>
                        </a>
                      ) : (
                        <button
                          onClick={() => setShowInfoModal(true)}
                          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-charcoal-900 text-cream-50 font-medium rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900 shadow-depth-md hover:shadow-depth-lg min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 text-sm sm:text-base"
                          aria-label="Trendyol'da satın al bilgisi"
                        >
                          <ShoppingCart size={18} aria-hidden="true" />
                          <span>Trendyol&apos;da Satın Al</span>
                        </button>
                      )}
                    </div>
              </div>
            </motion.div>
          </motion.div>
        ))}
        </div>
      )}
      
      {/* Load More Button */}
      {products.length > 0 && visibleCount < products.length && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-6 py-3 bg-charcoal-900 text-cream-50 font-medium rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation"
            aria-label="Daha fazla ürün yükle"
          >
            {isLoadingMore ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-cream-50"></span>
                Yükleniyor...
              </span>
            ) : (
              `Daha Fazla Göster (${products.length - visibleCount} ürün kaldı)`
            )}
          </button>
        </div>
      )}

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
              className="bg-white rounded-lg max-w-md w-full p-6 sm:p-8 shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gold-100 rounded-full">
                    <Info className="text-gold-600" size={24} />
                  </div>
                  <h3 id="modal-title" className="text-xl sm:text-2xl font-serif font-bold text-charcoal-900">
                    Ön Liste
                  </h3>
                </div>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="text-charcoal-400 hover:text-charcoal-900 premium-transition min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 rounded"
                  aria-label="Modalı kapat"
                >
                  <X size={24} aria-hidden="true" />
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-charcoal-700 leading-relaxed">
                  Bu ürün henüz <span className="font-semibold text-charcoal-900">Trendyol&apos;da satışta değil</span>.
                </p>
                <p className="text-charcoal-600 leading-relaxed">
                  Bu sitemizde <span className="font-semibold text-gold-600">ön liste</span> olarak görüntülenmektedir. 
                  Ürün Trendyol&apos;da satışa çıktığında buradan satın alabileceksiniz.
                </p>
                <p className="text-sm text-charcoal-500 italic">
                  Yakında Trendyol&apos;da olacak!
                </p>
              </div>

              <button
                onClick={() => setShowInfoModal(false)}
                className="w-full mt-6 px-6 py-3 bg-charcoal-900 text-cream-50 font-medium rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900 min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
                aria-label="Anladım, modalı kapat"
              >
                Anladım
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

