'use client'

import { useState, useEffect } from 'react'
import { X, Info, AlertTriangle, CheckCircle, Tag, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { logger as loggerClient } from '@/lib/logger-client'

interface Announcement {
  _id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'promotion'
  link?: string
  linkText?: string
}

const typeConfig = {
  info: {
    icon: Info,
    bgGradient: 'from-blue-50 via-blue-50/95 to-blue-50',
    borderColor: 'border-blue-200/60',
    textColor: 'text-blue-900',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    shadow: 'shadow-blue-100/50',
  },
  warning: {
    icon: AlertTriangle,
    bgGradient: 'from-yellow-50 via-yellow-50/95 to-yellow-50',
    borderColor: 'border-yellow-200/60',
    textColor: 'text-yellow-900',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    shadow: 'shadow-yellow-100/50',
  },
  success: {
    icon: CheckCircle,
    bgGradient: 'from-green-50 via-green-50/95 to-green-50',
    borderColor: 'border-green-200/60',
    textColor: 'text-green-900',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    buttonColor: 'bg-green-600 hover:bg-green-700 text-white',
    shadow: 'shadow-green-100/50',
  },
  promotion: {
    icon: Tag,
    bgGradient: 'from-gold-50 via-gold-100/90 to-gold-50',
    borderColor: 'border-gold-300/60',
    textColor: 'text-gold-900',
    iconBg: 'bg-gold-200',
    iconColor: 'text-gold-700',
    buttonColor: 'bg-gold-500 hover:bg-gold-600 text-charcoal-900',
    shadow: 'shadow-gold-200/50',
  },
}

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnnouncement()
    
    // Development mode'da real-time updates'i devre dışı bırak
    if (process.env.NODE_ENV === 'production') {
      const interval = setInterval(fetchAnnouncement, 30000) // Her 30 saniyede bir
      return () => clearInterval(interval)
    }
  }, [])

  const fetchAnnouncement = async () => {
    try {
      const timestamp = Date.now()
      const res = await fetch(`/api/announcements?t=${timestamp}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      
      if (data.success && data.data && data.data.length > 0) {
        // Sadece aktif olan ve tarih aralığında olan duyuruları filtrele
        const activeAnnouncements = data.data.filter((ann: any) => {
          const now = new Date()
          const startDate = ann.startDate ? new Date(ann.startDate) : null
          const endDate = ann.endDate ? new Date(ann.endDate) : null
          
          return (
            ann.isActive &&
            (!startDate || now >= startDate) &&
            (!endDate || now <= endDate)
          )
        })
        
        if (activeAnnouncements.length > 0) {
          // En yeni duyuruyu göster
          const latestAnnouncement = activeAnnouncements.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0]
          
          // LocalStorage'da kapatılmış duyuruları kontrol et
          const dismissedIds = JSON.parse(
            localStorage.getItem('dismissedAnnouncements') || '[]'
          )
          
          if (!dismissedIds.includes(latestAnnouncement._id)) {
            setAnnouncement(latestAnnouncement)
          }
        }
      }
    } catch (error) {
      loggerClient.error('Error fetching announcement:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    if (announcement) {
      const dismissedIds = JSON.parse(
        localStorage.getItem('dismissedAnnouncements') || '[]'
      )
      dismissedIds.push(announcement._id)
      localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissedIds))
      setDismissed(true)
    }
  }

  // Banner yüksekliğini CSS variable olarak ayarla
  useEffect(() => {
    if (announcement && !dismissed && !loading) {
      const updateHeight = () => {
        const banner = document.querySelector('[data-announcement-banner]') as HTMLElement
        if (banner) {
          const height = banner.offsetHeight
          document.documentElement.style.setProperty('--announcement-height', `${height}px`)
        } else {
          document.documentElement.style.setProperty('--announcement-height', '0px')
        }
      }
      
      // İlk render'dan sonra yüksekliği ayarla
      setTimeout(updateHeight, 100)
      window.addEventListener('resize', updateHeight)
      
      return () => {
        window.removeEventListener('resize', updateHeight)
      }
    } else {
      document.documentElement.style.setProperty('--announcement-height', '0px')
    }
  }, [announcement, dismissed, loading])

  if (loading || dismissed || !announcement) {
    return null
  }

  const config = typeConfig[announcement.type]
  const Icon = config.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        data-announcement-banner
        className={`fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r ${config.bgGradient} border-b ${config.borderColor} ${config.textColor} backdrop-blur-sm`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            {/* Icon ve İçerik */}
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className={`${config.iconBg} ${config.iconColor} rounded-full p-2.5 sm:p-3 flex-shrink-0 shadow-depth-sm`}
              >
                <Icon size={18} className="sm:w-5 sm:h-5" />
              </motion.div>
              
              <div className="flex-1 min-w-0">
                {announcement.title && (
                  <h4 className="font-serif font-semibold text-sm sm:text-base md:text-lg mb-1 sm:mb-1.5 leading-tight">
                    {announcement.title}
                  </h4>
                )}
                <p className="text-xs sm:text-sm md:text-base leading-relaxed opacity-95">
                  {announcement.message}
                </p>
              </div>
            </div>
            
            {/* Buton ve Kapat */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {announcement.link && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href={announcement.link}
                    className={`${config.buttonColor} px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold premium-transition flex items-center justify-center gap-2 shadow-depth-sm hover:shadow-depth-md whitespace-nowrap min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2`}
                    aria-label={announcement.linkText || 'Koleksiyonu incele'}
                  >
                    <span>{announcement.linkText || 'Koleksiyonu İncele'}</span>
                    <ArrowRight size={14} className="sm:w-4 sm:h-4 flex-shrink-0" aria-hidden="true" />
                  </Link>
                </motion.div>
              )}
              <motion.button
                onClick={handleDismiss}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className={`${config.textColor} opacity-60 hover:opacity-100 premium-transition p-1.5 sm:p-2 rounded-lg hover:bg-white/20 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2`}
                aria-label="Duyuruyu kapat"
              >
                <X size={18} className="sm:w-5 sm:h-5" aria-hidden="true" />
              </motion.button>
            </div>
          </div>
        </div>
        
        {/* Alt border efekti */}
        <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current/20 to-transparent`} />
      </motion.div>
    </AnimatePresence>
  )
}

