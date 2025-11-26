'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import EmptyState from '@/components/common/EmptyState'
import { StoryCardSkeleton } from '@/components/common/SkeletonLoader'

interface Story {
  _id: string
  title: string
  description: string
  totalChapters: number
  coverImage: string
  isActive?: boolean
}

export default function StoriesList() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStories() {
      try {
        const res = await fetch('/api/stories')
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        
        const data = await res.json()
        
        // Yeni standardize edilmiş API formatı
        if (data.success === false || data.error) {
          console.error('API Error:', data.error)
          setError(data.message || data.error || 'Hikayeler yüklenirken bir hata oluştu')
          setStories([])
        } else {
          setError(null)
          // Yeni format: { success: true, data: [...] } veya eski format: [...]
          const storiesData = data.data || data
          // Sadece aktif hikayeleri göster
          const activeStories = storiesData.filter((story: Story) => story.isActive !== false)
          setStories(activeStories)
        }
      } catch (error: any) {
        console.error('Error fetching stories:', error)
        setError('Hikayeler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.')
        setStories([])
      } finally {
        setLoading(false)
      }
    }
    fetchStories()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => (
          <StoryCardSkeleton key={i} />
        ))}
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

  if (stories.length === 0) {
    return (
      <EmptyState
        icon="book"
        title="Henüz hikaye bulunmamaktadır"
        description="Yakında yeni hikayeler eklenecek. Lütfen daha sonra tekrar kontrol edin."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {stories.map((story, index) => (
        <motion.div
          key={story._id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
        >
          <Link href={`/konseptler/hikayeler/${story._id}`} className="block group">
            <div className="bg-white rounded-lg overflow-hidden border border-charcoal-900/10 premium-hover">
              <div className="relative h-64 bg-cream-200">
                {story.coverImage ? (
                  <Image
                    src={story.coverImage}
                    alt={story.title}
                    fill
                    className="object-cover"
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-charcoal-400">
                    Görsel Yok
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-serif font-semibold text-charcoal-900 mb-3 group-hover:text-gold-500 premium-transition">
                  {story.title}
                </h3>
                <p className="text-sm text-charcoal-600 mb-4 line-clamp-3">
                  {story.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gold-600 font-medium">
                    {story.totalChapters || 0} bölüm
                  </span>
                  <span className="text-gold-600 group-hover:translate-x-1 premium-transition">
                    →
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}

