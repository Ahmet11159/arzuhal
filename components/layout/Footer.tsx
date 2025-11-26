'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { MapPin, Mail, Phone, Map } from 'lucide-react'
import { logger as loggerClient } from '@/lib/logger-client'

interface BusinessInfo {
  businessName: string
  address: string
  city: string
  district?: string
  postalCode?: string
  country: string
  phone?: string
  email: string
  googleMapsLink?: string
  appleMapsLink?: string
}

export default function Footer() {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const fetchBusinessInfo = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      
      // Cache'i bypass et - her zaman güncel veriyi al
      // Timestamp ekleyerek cache'i bypass et
      const timestamp = Date.now()
      const res = await fetch(`/api/business-info?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      
      if (data.success && data.data) {
        setBusinessInfo(data.data)
      } else if (data.success && !data.data) {
        // Veri yoksa null yap
        setBusinessInfo(null)
      } else {
        // API başarısız olduysa null yap
        setBusinessInfo(null)
      }
    } catch (error) {
      loggerClient.error('Error fetching business info:', error)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
      // İlk yükleme tamamlandı
      setIsInitialLoad((prev) => {
        if (prev) {
          return false
        }
        return prev
      })
    }
  }, [])

  useEffect(() => {
    // İlk yükleme
    const initialFetch = async () => {
      setLoading(true)
      await fetchBusinessInfo(true)
    }
    initialFetch()
    
    // Development mode'da polling'i devre dışı bırak (performans için)
    if (process.env.NODE_ENV === 'production') {
      // Her 10 saniyede bir güncel veriyi kontrol et (admin güncellemelerini yakalamak için)
      const interval = setInterval(() => {
        fetchBusinessInfo(false) // Loading gösterme
      }, 10000) // 10 saniye
      
      // Sayfa görünür olduğunda da kontrol et (kullanıcı başka tab'a geçip geri döndüğünde)
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchBusinessInfo(false) // Loading gösterme
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      // Window focus olduğunda da kontrol et
      const handleFocus = () => {
        fetchBusinessInfo(false) // Loading gösterme
      }
      
      window.addEventListener('focus', handleFocus)
      
      return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatAddress = () => {
    if (!businessInfo) return null
    
    const parts = [
      businessInfo.address,
      businessInfo.district,
      businessInfo.city,
      businessInfo.postalCode,
      businessInfo.country,
    ].filter(Boolean)
    
    return parts.join(', ')
  }

  return (
    <footer className="bg-charcoal-900 text-cream-50 mt-20" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="sm:col-span-2 md:col-span-1">
            <h3 className="text-xl sm:text-2xl font-serif font-bold mb-3 sm:mb-4">
              {businessInfo?.businessName || 'ARZUHAL'}
            </h3>
            <p className="text-cream-200 text-sm leading-relaxed">
              Kalite, estetik, güç, zarafet ve özgünlük değerleriyle üretilen premium Türk kahve fincanları.
            </p>
          </div>
          
          <div>
            <h4 className="font-serif font-semibold mb-4">Bağlantılar</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/urunler" 
                  className="text-cream-200 hover:text-gold-400 premium-transition focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-charcoal-900 rounded px-1 py-0.5 inline-block touch-manipulation"
                  aria-label="Ürünler sayfasına git"
                >
                  Ürünler
                </Link>
              </li>
              <li>
                <Link 
                  href="/konseptler" 
                  className="text-cream-200 hover:text-gold-400 premium-transition focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-charcoal-900 rounded px-1 py-0.5 inline-block touch-manipulation"
                  aria-label="Konseptler sayfasına git"
                >
                  Konseptler
                </Link>
              </li>
              <li>
                <Link 
                  href="/hakkimizda" 
                  className="text-cream-200 hover:text-gold-400 premium-transition focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-charcoal-900 rounded px-1 py-0.5 inline-block touch-manipulation"
                  aria-label="Hakkımızda sayfasına git"
                >
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link 
                  href="/sss" 
                  className="text-cream-200 hover:text-gold-400 premium-transition focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-charcoal-900 rounded px-1 py-0.5 inline-block touch-manipulation"
                  aria-label="SSS sayfasına git"
                >
                  SSS
                </Link>
              </li>
              <li>
                <Link 
                  href="/iletisim" 
                  className="text-cream-200 hover:text-gold-400 premium-transition focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-charcoal-900 rounded px-1 py-0.5 inline-block touch-manipulation"
                  aria-label="İletişim sayfasına git"
                >
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-semibold mb-4">İletişim</h4>
            {loading ? (
              <p className="text-cream-200 text-sm">Yükleniyor...</p>
            ) : businessInfo ? (
              <div className="space-y-3 text-sm">
                {businessInfo.email && (
                  <div className="flex items-start gap-2">
                    <Mail size={16} className="text-gold-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <a 
                      href={`mailto:${businessInfo.email}`}
                      className="text-cream-200 hover:text-gold-400 premium-transition focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-charcoal-900 rounded px-1 py-0.5 touch-manipulation"
                      aria-label={`${businessInfo.email} adresine e-posta gönder`}
                    >
                      {businessInfo.email}
                    </a>
                  </div>
                )}
                
                {businessInfo.phone && (
                  <div className="flex items-start gap-2">
                    <Phone size={16} className="text-gold-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <a 
                      href={`tel:${businessInfo.phone}`}
                      className="text-cream-200 hover:text-gold-400 premium-transition focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-charcoal-900 rounded px-1 py-0.5 touch-manipulation"
                      aria-label={`${businessInfo.phone} numarasını ara`}
                    >
                      {businessInfo.phone}
                    </a>
                  </div>
                )}
                
                {formatAddress() && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-gold-400 mt-0.5 flex-shrink-0" />
                    <div className="text-cream-200">
                      <p>{formatAddress()}</p>
                      <div className="flex gap-3 mt-2">
                        {businessInfo.googleMapsLink && (
                          <a
                            href={businessInfo.googleMapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold-400 hover:text-gold-300 premium-transition text-xs flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-charcoal-900 rounded px-1 py-0.5 touch-manipulation"
                            aria-label="Google Maps'te konumu aç"
                          >
                            <Map size={12} aria-hidden="true" />
                            Google Maps
                          </a>
                        )}
                        {businessInfo.appleMapsLink && (
                          <a
                            href={businessInfo.appleMapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold-400 hover:text-gold-300 premium-transition text-xs flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-charcoal-900 rounded px-1 py-0.5 touch-manipulation"
                            aria-label="Apple Maps'te konumu aç"
                          >
                            <Map size={12} aria-hidden="true" />
                            Apple Maps
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-cream-200 text-sm">
                info@arzuhal.com
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-charcoal-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-cream-300">
          <p>&copy; {new Date().getFullYear()} ARZUHAL. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  )
}

