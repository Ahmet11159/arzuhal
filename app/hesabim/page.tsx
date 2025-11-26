'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { BookOpen, Check } from 'lucide-react'
import Breadcrumbs from '@/components/common/Breadcrumbs'

interface StoryProgress {
  storyId: string
  storyTitle: string
  storyCover: string
  unlockedChapters: number[]
  totalChapters: number
  purchasedProducts: string[]
}

export default function MyAccountPage() {
  const [progress, setProgress] = useState<StoryProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id')
    if (storedUserId) {
      setUserId(storedUserId)
      fetchProgress(storedUserId)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchProgress = async (uid: string) => {
    try {
      // Tüm hikayeleri al
      const storiesRes = await fetch('/api/stories')
      const storiesData = await storiesRes.json()
      
      // Yeni standardize edilmiş API formatı
      const stories = storiesData.success === false || storiesData.error 
        ? [] 
        : (storiesData.data || storiesData || [])

      // Her hikaye için ilerlemeyi al
      const progressPromises = stories.map(async (story: any) => {
        const progressRes = await fetch(`/api/stories/${story._id}/progress?userId=${uid}`)
        if (progressRes.ok) {
          const progressResponse = await progressRes.json()
          // Yeni standardize edilmiş API formatı
          const progressData = progressResponse.success === false || progressResponse.error
            ? { unlockedChapters: [], purchasedProducts: [] }
            : (progressResponse.data || progressResponse)
          return {
            storyId: story._id,
            storyTitle: story.title,
            storyCover: story.coverImage,
            unlockedChapters: progressData.unlockedChapters || [],
            totalChapters: story.totalChapters || 0,
            purchasedProducts: progressData.purchasedProducts || [],
          }
        }
        return null
      })

      const results = await Promise.all(progressPromises)
      setProgress(results.filter((p) => p !== null && p.unlockedChapters.length > 0))
    } catch (error) {
      console.error('Error fetching progress:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="pt-20 px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-cream-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mb-4"></div>
            <p className="text-charcoal-600 font-medium">Hikaye ilerlemeniz yükleniyor...</p>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="pt-20 px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-cream-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-cream-100 rounded-full mb-6">
              <BookOpen size={40} className="text-charcoal-300" />
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-4">
              Hesabım
            </h1>
            <p className="text-lg text-charcoal-600 mb-2">
              Hikaye ilerlemenizi görmek için bir hikayeye başlamalısınız.
            </p>
            <p className="text-sm text-charcoal-500 mb-8">
              Hikayeleri keşfedin, fincanlarınızı seçin ve hikayeyi tamamlayın.
            </p>
            <Link
              href="/konseptler/hikayeler"
              className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition font-medium"
            >
              <BookOpen size={18} />
              Hikayeleri Keşfet
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  const breadcrumbs = [
    { label: 'Ana Sayfa', href: '/' },
    { label: 'Hesabım', href: '/hesabim' },
  ]

  return (
    <div className="pt-20 px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-cream-50">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs items={breadcrumbs} />

        <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-8">
          Hikaye İlerlemem
        </h1>

        {progress.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-charcoal-200"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-cream-100 rounded-full mb-6">
              <BookOpen size={40} className="text-charcoal-300" />
            </div>
            <h3 className="text-xl font-semibold text-charcoal-900 mb-2">
              Henüz ilerleme yok
            </h3>
            <p className="text-charcoal-600 mb-6 max-w-md mx-auto">
              Henüz hiçbir hikayede ilerleme kaydetmediniz. Hikayeleri keşfedin ve fincanlarınızı seçerek hikayeyi tamamlayın.
            </p>
            <Link
              href="/konseptler/hikayeler"
              className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition font-medium"
            >
              <BookOpen size={18} />
              Hikayeleri Keşfet
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {progress.map((story) => {
              const progressPercentage =
                story.totalChapters > 0
                  ? (story.unlockedChapters.length / story.totalChapters) * 100
                  : 0
              const isComplete = story.unlockedChapters.length === story.totalChapters

              return (
                <motion.div
                  key={story.storyId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg overflow-hidden border border-charcoal-900/10 shadow-sm"
                >
                  <Link href={`/konseptler/hikayeler/${story.storyId}`}>
                    <div className="relative h-48 bg-cream-200">
                      {story.storyCover ? (
                        <Image
                          src={story.storyCover}
                          alt={story.storyTitle}
                          fill
                          className="object-cover"
                        />
                      ) : null}
                      {isComplete && (
                        <div className="absolute top-2 right-2 bg-gold-500 text-white rounded-full p-2">
                          <Check size={20} />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-6">
                    <h3 className="text-xl font-serif font-semibold text-charcoal-900 mb-3">
                      {story.storyTitle}
                    </h3>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-charcoal-600">
                          {story.unlockedChapters.length} / {story.totalChapters} bölüm
                        </span>
                        <span className="text-sm font-semibold text-gold-600">
                          %{Math.round(progressPercentage)}
                        </span>
                      </div>
                      <div className="w-full bg-cream-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercentage}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-gold-400 to-gold-600"
                        />
                      </div>
                    </div>

                    <Link
                      href={`/konseptler/hikayeler/${story.storyId}`}
                      className="block text-center px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 premium-transition text-sm"
                    >
                      {isComplete ? 'Hikayeyi Tekrar Oku' : 'Devam Et'}
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


