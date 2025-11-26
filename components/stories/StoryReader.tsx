'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Gift } from 'lucide-react'

interface Product {
  _id: string
  name: string
  images: string[]
  description: string
  price?: number // Klasik ürünler için tek fincan fiyatı
  setPrice?: number // Konsept ürünler için 6'lı takım fiyatı
  category?: string
  trendyolLink?: string
}

interface Chapter {
  chapterNumber: number
  title: string
  content: string
  productId: {
    _id: string
    name: string
    images: string[]
    description: string
    price?: number // Klasik ürünler için tek fincan fiyatı
    setPrice?: number // Konsept ürünler için 6'lı takım fiyatı
    category?: string
    trendyolLink?: string
  }
  image?: string
  trendyolLink?: string
}

interface Story {
  _id: string
  title: string
  description: string
  introContent: string
  coverImage: string
  chapters: Chapter[]
  totalChapters: number
  fullSetTrendyolLink?: string
}

export default function StoryReader({ story }: { story: Story }) {
  return (
    <div className="pt-20 px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-cream-50">
      <div className="max-w-7xl mx-auto">
        {/* Hikaye Başlığı ve Kapak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Link 
            href="/konseptler/hikayeler" 
            className="inline-block text-charcoal-600 hover:text-charcoal-900 premium-transition text-sm mb-6"
          >
            ← Tüm Hikayelere Dön
          </Link>
          
          <div className="relative h-80 bg-cream-200 rounded-lg overflow-hidden mb-6">
            {story.coverImage && (
              <Image
                src={story.coverImage}
                alt={story.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                className="object-cover"
                priority
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-cream-50">
              <h1 className="text-4xl md:text-5xl font-serif font-bold mb-2">
                {story.title}
              </h1>
              <p className="text-lg">{story.description}</p>
            </div>
          </div>

          {/* Tüm Hikaye Takımı Butonu - Her zaman göster */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-md mx-auto"
          >
            {story.fullSetTrendyolLink && story.fullSetTrendyolLink.trim() ? (
              <>
                <a
                  href={story.fullSetTrendyolLink.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-gold-500 text-charcoal-900 font-semibold rounded-lg premium-transition hover:bg-gold-600 shadow-lg min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
                  aria-label="Tüm hikaye takımını Trendyol'da satın al"
                >
                  <Gift size={20} className="sm:w-6 sm:h-6" aria-hidden="true" />
                  <span className="text-sm sm:text-base">Tüm Hikaye Takımını Al (6 Fincan + 1 Hediye Fincan)</span>
                  <ShoppingCart size={18} className="sm:w-5 sm:h-5" aria-hidden="true" />
                </a>
                <p className="text-sm text-charcoal-600 mt-2">
                  Tüm hikayenin fincanlarını bir arada alın, kapak fotoğrafındaki fincan hediye!
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3 px-8 py-4 bg-gold-300 text-charcoal-700 font-semibold rounded-lg opacity-60 cursor-not-allowed">
                  <Gift size={24} />
                  <span>Tüm Hikaye Takımı Linki Henüz Eklenmedi</span>
                  <ShoppingCart size={20} />
                </div>
                <p className="text-sm text-charcoal-500 mt-2">
                  Tüm hikaye takımı için Trendyol linki admin panelinden eklenebilir.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Giriş Bölümü */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-charcoal-900/10 mb-12 p-8"
        >
          <h2 className="text-2xl font-serif font-semibold text-charcoal-900 mb-4">
            Giriş
          </h2>
          <div className="prose max-w-none text-charcoal-700 leading-relaxed whitespace-pre-line">
            {story.introContent}
          </div>
        </motion.div>

        {/* Bölümler */}
        <div className="space-y-16">
          {story.chapters.map((chapter, index) => {
            const product = chapter.productId
            const productImage = product.images && product.images[0] ? product.images[0] : null
            // Önce chapter'daki Trendyol linkini kontrol et, yoksa product'takini kullan
            const trendyolLink = (chapter.trendyolLink && chapter.trendyolLink.trim()) || (product.trendyolLink && product.trendyolLink.trim()) || null
            
            // Debug: Trendyol link kontrolü
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔗 Bölüm ${chapter.chapterNumber} - Product Objesi:`, product)
              console.log(`🔗 Bölüm ${chapter.chapterNumber} - Chapter Link:`, chapter.trendyolLink)
              console.log(`🔗 Bölüm ${chapter.chapterNumber} - Product Link:`, product.trendyolLink)
              console.log(`🔗 Bölüm ${chapter.chapterNumber} - Product Link Type:`, typeof product.trendyolLink)
              console.log(`🔗 Bölüm ${chapter.chapterNumber} - Final Link:`, trendyolLink)
            }

            return (
              <motion.div
                key={chapter.chapterNumber}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-charcoal-900/10 overflow-hidden"
              >
                {/* Bölüm Başlığı */}
                <div className="bg-gold-50 p-6 border-b border-gold-200">
                  <h3 className="text-2xl font-serif font-semibold text-charcoal-900">
                    Bölüm {chapter.chapterNumber}: {chapter.title}
                  </h3>
                </div>

                {/* Bölüm İçeriği - Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
                  {/* Sol Taraf: İçerik (Geniş Alan) */}
                  <div className="lg:col-span-2">
                    {chapter.image && (
                      <div className="relative h-64 bg-cream-200 rounded-lg overflow-hidden mb-6">
                        <Image
                          src={chapter.image}
                          alt={chapter.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 66vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="prose max-w-none text-charcoal-700 leading-relaxed whitespace-pre-line">
                      {chapter.content}
                    </div>
                  </div>

                  {/* Sağ Taraf: Fincan Fotoğrafı ve Trendyol Butonu */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-24">
                      <div className="bg-cream-50 rounded-lg p-6 border border-charcoal-900/10">
                        <h4 className="text-lg font-serif font-semibold text-charcoal-900 mb-4">
                          Bu Bölümün Fincanı
                        </h4>
                        
                        {/* Fincan Fotoğrafı */}
                        {productImage ? (
                          <div className="relative h-64 bg-cream-200 rounded-lg overflow-hidden mb-4">
                            <Image
                              src={productImage}
                              alt={product.name}
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-64 bg-cream-200 rounded-lg flex items-center justify-center mb-4">
                            <p className="text-charcoal-400">Görsel Yok</p>
                          </div>
                        )}

                        {/* Fincan Bilgileri */}
                        <div className="mb-4">
                          <h5 className="font-serif font-semibold text-charcoal-900 mb-2">
                            {product.name}
                          </h5>
                          {product.description && (
                            <p className="text-sm text-charcoal-600 mb-2">
                              {product.description}
                            </p>
                          )}
                          {/* Fiyat Gösterimi - Konsept ürünler için setPrice, klasik için price */}
                          {(product.category === 'konsept' && product.setPrice) ? (
                            <div>
                              <p className="text-lg font-semibold text-charcoal-900">
                                {product.setPrice.toLocaleString('tr-TR')} ₺
                              </p>
                              <p className="text-xs text-charcoal-500 mt-1">
                                6'lı Takım Fiyatı
                              </p>
                            </div>
                          ) : product.price ? (
                            <div>
                              <p className="text-lg font-semibold text-charcoal-900">
                                {product.price.toLocaleString('tr-TR')} ₺
                              </p>
                              <p className="text-xs text-charcoal-500 mt-1">
                                Tek Fincan Fiyatı
                              </p>
                            </div>
                          ) : null}
                        </div>

                        {/* 6'lı Takım Al Butonu */}
                        {trendyolLink && trendyolLink.trim() ? (
                          <a
                            href={trendyolLink.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gold-500 text-charcoal-900 font-semibold rounded-lg premium-transition hover:bg-gold-600 shadow-md mb-3"
                          >
                            <Gift size={20} />
                            <span>6'lı Takım Al</span>
                            <ShoppingCart size={18} />
                          </a>
                        ) : (
                          <div className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gold-300 text-charcoal-700 font-semibold rounded-lg opacity-60 cursor-not-allowed mb-3">
                            <Gift size={20} />
                            <span>6'lı Takım Linki Henüz Eklenmedi</span>
                            <ShoppingCart size={18} />
                          </div>
                        )}

                        {/* Küçük Link - Ürün Detay Sayfasına Yönlendir */}
                        <Link
                          href={`/urunler/${product._id}`}
                          className="block mt-3 text-center text-sm text-charcoal-600 hover:text-charcoal-900 premium-transition"
                        >
                          Ürün detayını gör →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Alt Kısım - Tüm Takım Butonu (Tekrar) - Her zaman göster */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-gold-100 to-gold-200 rounded-lg p-8 border-2 border-gold-300">
            <Gift size={48} className="mx-auto text-gold-600 mb-4" />
            <h3 className="text-2xl font-serif font-bold text-charcoal-900 mb-2">
              Tüm Hikaye Takımını Alın
            </h3>
            <p className="text-charcoal-700 mb-6">
              6 bölümün fincanlarını bir arada alın, kapak fotoğrafındaki fincan hediye olarak gönderilir!
            </p>
            {story.fullSetTrendyolLink && story.fullSetTrendyolLink.trim() ? (
              <a
                href={story.fullSetTrendyolLink.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gold-500 text-charcoal-900 font-semibold rounded-lg premium-transition hover:bg-gold-600 shadow-lg"
              >
                <Gift size={24} />
                <span>Tüm Takımı Trendyol'da Gör</span>
                <ShoppingCart size={20} />
              </a>
            ) : (
              <div className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gold-300 text-charcoal-700 font-semibold rounded-lg opacity-60 cursor-not-allowed">
                <Gift size={24} />
                <span>Tüm Takım Linki Henüz Eklenmedi</span>
                <ShoppingCart size={20} />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
