'use client'

import { useState, useEffect } from 'react'
import { Save, MapPin, Mail, Phone, Map, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { sanitizeInput, isValidUrl } from '@/lib/utils'

interface BusinessInfo {
  _id?: string
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
  isActive: boolean
}

export default function BusinessInfoManagement() {
  const [formData, setFormData] = useState<BusinessInfo>({
    businessName: '',
    address: '',
    city: '',
    district: '',
    postalCode: '',
    country: 'Türkiye',
    phone: '',
    email: '',
    googleMapsLink: '',
    appleMapsLink: '',
    isActive: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { error: showError, success: showSuccess } = useToast()

  useEffect(() => {
    fetchBusinessInfo()
  }, [])

  const fetchBusinessInfo = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/business-info')
      const data = await res.json()
      
      if (data.success && data.data) {
        setFormData({
          businessName: data.data.businessName || '',
          address: data.data.address || '',
          city: data.data.city || '',
          district: data.data.district || '',
          postalCode: data.data.postalCode || '',
          country: data.data.country || 'Türkiye',
          phone: data.data.phone || '',
          email: data.data.email || '',
          googleMapsLink: data.data.googleMapsLink || '',
          appleMapsLink: data.data.appleMapsLink || '',
          isActive: data.data.isActive !== false,
        })
      }
    } catch (error) {
      console.error('Error fetching business info:', error)
      showError('İşletme bilgileri yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validasyon
      if (!formData.businessName.trim() || !formData.address.trim() || !formData.city.trim() || !formData.email.trim()) {
        showError('İşletme adı, adres, şehir ve e-posta zorunludur')
        setSaving(false)
        return
      }

      // URL validasyonu
      if (formData.googleMapsLink && !isValidUrl(formData.googleMapsLink)) {
        showError('Geçerli bir Google Maps linki girin')
        setSaving(false)
        return
      }

      if (formData.appleMapsLink && !isValidUrl(formData.appleMapsLink)) {
        showError('Geçerli bir Apple Maps linki girin')
        setSaving(false)
        return
      }

      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/business-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        showSuccess('İşletme bilgileri başarıyla kaydedildi')
      } else {
        showError(data.error || 'İşletme bilgileri kaydedilemedi')
      }
    } catch (error: any) {
      console.error('Error saving business info:', error)
      showError('İşletme bilgileri kaydedilirken bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="animate-spin text-gold-500 mx-auto mb-4" size={32} />
        <p className="text-charcoal-600">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-semibold text-charcoal-900">
          İşletme Bilgileri Yönetimi
        </h2>
        <p className="text-sm text-charcoal-600 mt-2">
          İşletme adresi ve iletişim bilgilerini yönetin. Bu bilgiler footer ve iletişim sayfalarında gösterilir.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-charcoal-900/10 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              İşletme Adı *
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, businessName: sanitized })
              }}
              required
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              E-posta *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, email: sanitized })
              }}
              required
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal-900 mb-2">
            Adres *
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => {
              // Adres alanı için sadece XSS koruması, trim yapmıyoruz
              const sanitized = e.target.value.replace(/[<>]/g, '')
              setFormData({ ...formData, address: sanitized })
            }}
            required
            rows={3}
            className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            placeholder="Mahalle, Sokak, Bina No, Daire No"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Şehir *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, city: sanitized })
              }}
              required
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              İlçe
            </label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, district: sanitized })
              }}
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Posta Kodu
            </label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, postalCode: sanitized })
              }}
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Ülke
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, country: sanitized })
              }}
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Telefon
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, phone: sanitized })
              }}
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="+90 555 123 45 67"
            />
          </div>
        </div>

        <div className="border-t border-charcoal-900/10 pt-6">
          <h3 className="text-lg font-semibold text-charcoal-900 mb-4 flex items-center gap-2">
            <Map size={20} />
            Harita Linkleri
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal-900 mb-2">
                Google Maps Linki
              </label>
              <input
                type="url"
                value={formData.googleMapsLink}
                onChange={(e) => {
                  const sanitized = sanitizeInput(e.target.value)
                  setFormData({ ...formData, googleMapsLink: sanitized })
                }}
                placeholder="https://maps.google.com/..."
                className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <p className="text-xs text-charcoal-500 mt-1">
                Google Maps'ten "Paylaş" butonuna tıklayarak linki kopyalayabilirsiniz
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal-900 mb-2">
                Apple Maps Linki
              </label>
              <input
                type="url"
                value={formData.appleMapsLink}
                onChange={(e) => {
                  const sanitized = sanitizeInput(e.target.value)
                  setFormData({ ...formData, appleMapsLink: sanitized })
                }}
                placeholder="https://maps.apple.com/..."
                className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <p className="text-xs text-charcoal-500 mt-1">
                Apple Maps'ten "Paylaş" butonuna tıklayarak linki kopyalayabilirsiniz
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-charcoal-900/10">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save size={18} />
                Kaydet
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

