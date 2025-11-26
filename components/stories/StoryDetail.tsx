'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Check, X } from 'lucide-react'

interface Product {
  _id: string
  name: string
  images: string[]
  description: string
}

interface Story {
  _id: string
  title: string
  description: string
  totalChapters?: number // Story modelindeki totalChapters kullanılacak
  coverImage: string
  recommendedProducts?: Product[]
}

export default function StoryDetail({ story }: { story: Story }) {
  const [selectedCups, setSelectedCups] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showCollection, setShowCollection] = useState(false)

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products')
        const data = await res.json()
        // Yeni standardize edilmiş API formatı
        if (data.success === false || data.error) {
          console.error('API Error:', data.error)
          setProducts([])
        } else {
          setProducts(data.data || data)
        }
      } catch (error) {
        console.error('Error fetching products:', error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  // Story modelinde totalChapters var, bu hikaye için gerekli fincan sayısı
  const requiredCupCount = story.totalChapters || 6 // Varsayılan 6

  const toggleCupSelection = (productId: string) => {
    setSelectedCups((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId)
      } else {
        if (prev.length < requiredCupCount) {
          return [...prev, productId]
        }
        return prev
      }
    })
  }

  const isComplete = selectedCups.length === requiredCupCount
  const selectedProducts = products.filter((p) => selectedCups.includes(p._id))

  if (showCollection && isComplete) {
    return (
      <div className="pt-20 px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-cream-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-4">
              Hikaye Koleksiyonunuz
            </h1>
            <p className="text-lg text-charcoal-600">
              "{story.title}" hikayesi için seçtiğiniz fincanlar
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {selectedProducts.map((product, index) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg overflow-hidden border border-charcoal-900/10"
              >
                <div className="relative h-64 bg-cream-200">
                  {product.images && product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-charcoal-400">
                      Görsel Yok
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-serif font-semibold text-charcoal-900 mb-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-charcoal-600 line-clamp-2">
                    {product.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowCollection(false)}
              className="px-8 py-4 bg-charcoal-900 text-cream-50 font-medium premium-transition hover:bg-gold-500 hover:text-charcoal-900"
            >
              Tekrar Seç
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-20 px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-cream-50">
      <div className="max-w-7xl mx-auto">
        {/* Story Header */}
        <div className="mb-12">
          <div className="relative h-96 bg-cream-200 rounded-lg overflow-hidden mb-8">
            {story.coverImage ? (
              <Image
                src={story.coverImage}
                alt={story.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-charcoal-400">
                Görsel Yok
              </div>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-4">
            {story.title}
          </h1>
          <p className="text-lg text-charcoal-600 mb-6 max-w-3xl">
            {story.description}
          </p>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-gold-100 text-gold-700 rounded-full">
              <span className="font-medium">
                {selectedCups.length} / {requiredCupCount} fincan seçildi
              </span>
            </div>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-green-600"
              >
                <Check size={20} />
                <span className="font-medium">Hikaye tamamlandı!</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Product Selection */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-charcoal-600">Yükleniyor...</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-serif font-semibold text-charcoal-900 mb-8">
              Fincanlarınızı Seçin
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {products.map((product) => {
                const isSelected = selectedCups.includes(product._id)
                const isDisabled = !isSelected && selectedCups.length >= requiredCupCount

                return (
                  <motion.div
                    key={product._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className={`relative ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    onClick={() => !isDisabled && toggleCupSelection(product._id)}
                  >
                    <div
                      className={`bg-white rounded-lg overflow-hidden border-2 premium-transition ${
                        isSelected
                          ? 'border-gold-500 shadow-lg'
                          : 'border-charcoal-900/10 hover:border-gold-300'
                      }`}
                    >
                      <div className="relative h-48 bg-cream-200">
                        {product.images && product.images[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-charcoal-400">
                            Görsel Yok
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-gold-500 text-white rounded-full p-1">
                            <Check size={16} />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-serif font-semibold text-charcoal-900 mb-1">
                          {product.name}
                        </h3>
                        <p className="text-sm text-charcoal-600 line-clamp-2">
                          {product.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <button
                  onClick={() => setShowCollection(true)}
                  className="px-12 py-4 bg-charcoal-900 text-cream-50 font-medium text-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900"
                >
                  Koleksiyonu Görüntüle
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}



