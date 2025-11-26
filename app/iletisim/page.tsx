'use client'

import { useState, useEffect } from 'react'
import { MapPin, Mail, Phone, Map, Building2 } from 'lucide-react'
import Breadcrumbs from '@/components/common/Breadcrumbs'
import ContactForm from '@/components/common/ContactForm'
// Metadata için document.title kullanılıyor (client component)

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

export default function ContactPage() {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'İletişim - ARZUHAL'
    fetchBusinessInfo()
  }, [])

  const fetchBusinessInfo = async () => {
    try {
      const timestamp = Date.now()
      const res = await fetch(`/api/business-info?t=${timestamp}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      
      if (data.success && data.data) {
        setBusinessInfo(data.data)
      }
    } catch (error) {
      console.error('Error fetching business info:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const breadcrumbs = [
    { label: 'Ana Sayfa', href: '/' },
    { label: 'İletişim', href: '/iletisim' },
  ]

  return (
    <div className="pt-20 px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-cream-50">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs items={breadcrumbs} />

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-6">
            İletişim
          </h1>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            Sorularınız, önerileriniz veya destek talepleriniz için bizimle iletişime geçebilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Contact Form */}
          <ContactForm />

          {/* Business Info */}
          {loading ? (
            <div className="text-center py-16 glass-medium rounded-2xl">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mb-4"></div>
              <p className="text-charcoal-600 font-medium">İletişim bilgileri yükleniyor...</p>
            </div>
          ) : businessInfo ? (
            <div className="glass-medium rounded-2xl shadow-depth-lg p-8 space-y-8">
              {/* İşletme Adı */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-gold-200 via-gold-100 to-cream-50 rounded-lg shadow-depth-sm">
                  <Building2 size={24} className="text-gold-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-charcoal-900 mb-1">İşletme</h3>
                  <p className="text-charcoal-600">{businessInfo.businessName}</p>
                </div>
              </div>

              {/* E-posta */}
              {businessInfo.email && (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-gold-200 via-gold-100 to-cream-50 rounded-lg shadow-depth-sm">
                    <Mail size={24} className="text-gold-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal-900 mb-1">E-posta</h3>
                    <a
                      href={`mailto:${businessInfo.email}`}
                      className="text-charcoal-600 hover:text-gold-500 premium-transition"
                    >
                      {businessInfo.email}
                    </a>
                  </div>
                </div>
              )}

              {/* Telefon */}
              {businessInfo.phone && (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-gold-200 via-gold-100 to-cream-50 rounded-lg shadow-depth-sm">
                    <Phone size={24} className="text-gold-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal-900 mb-1">Telefon</h3>
                    <a
                      href={`tel:${businessInfo.phone}`}
                      className="text-charcoal-600 hover:text-gold-500 premium-transition"
                    >
                      {businessInfo.phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Adres */}
              {formatAddress() && (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-gold-200 via-gold-100 to-cream-50 rounded-lg shadow-depth-sm">
                    <MapPin size={24} className="text-gold-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-charcoal-900 mb-2">Adres</h3>
                    <p className="text-charcoal-600 mb-4">{formatAddress()}</p>
                    
                    {/* Harita Linkleri */}
                    {(businessInfo.googleMapsLink || businessInfo.appleMapsLink) && (
                      <div className="flex flex-wrap gap-3">
                        {businessInfo.googleMapsLink && (
                          <a
                            href={businessInfo.googleMapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition text-sm"
                          >
                            <Map size={16} />
                            Google Maps&apos;te Aç
                          </a>
                        )}
                        {businessInfo.appleMapsLink && (
                          <a
                            href={businessInfo.appleMapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition text-sm"
                          >
                            <Map size={16} />
                            Apple Maps&apos;te Aç
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-charcoal-900/10 p-8 text-center">
              <p className="text-charcoal-600">
                İletişim bilgileri henüz eklenmemiş. Lütfen daha sonra tekrar deneyin.
              </p>
              <p className="text-charcoal-500 text-sm mt-2">
                info@arzuhal.com
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
