'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Loader2, X, Image as ImageIcon } from 'lucide-react'
import ImageManager from './ImageManager'
import Image from 'next/image'
import { useToast } from '@/hooks/useToast'
import BackgroundManagementContent from './BackgroundManagementContent'

interface SiteImage {
  _id: string
  key: string
  imageUrl: string
  location: string
  description?: string
  altText?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function SiteImageManagement() {
  const [images, setImages] = useState<SiteImage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingImage, setEditingImage] = useState<SiteImage | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [activeSubTab, setActiveSubTab] = useState<'site-images' | 'backgrounds'>('site-images')
  const { error: showError, success: showSuccess } = useToast()

  useEffect(() => {
    fetchImages()
  }, [selectedLocation])

  const fetchImages = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('admin_token')
      const url = selectedLocation === 'all'
        ? '/api/site-images'
        : `/api/site-images?location=${selectedLocation}`
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      })

      if (!res.ok) {
        throw new Error('Görseller yüklenemedi')
      }

      const data = await res.json()
      setImages(data.success === false ? [] : (data.data || data))
    } catch (error) {
      console.error('Error fetching site images:', error)
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (key: string, imageUrl: string, location: string, description?: string, altText?: string) => {
    try {
      const token = localStorage.getItem('admin_token')
      
      // Mevcut görsel var mı kontrol et
      const existing = images.find(img => img.key === key)
      
      const url = existing
        ? `/api/site-images/${key}`
        : '/api/site-images'
      
      const method = existing ? 'PUT' : 'POST'
      
      const body = existing
        ? { imageUrl, location, description, altText }
        : { key, imageUrl, location, description, altText, isActive: true }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Görsel kaydedilemedi')
      }

      await fetchImages()
      setShowForm(false)
      setEditingImage(null)
      showSuccess('Görsel başarıyla kaydedildi')
    } catch (error: any) {
      console.error('Error saving site image:', error)
      showError(error.message || 'Görsel kaydedilemedi')
      throw error
    }
  }

  const handleDelete = async (key: string) => {
    const image = images.find(img => img.key === key)
    const imageName = image?.key || 'Bu görsel'
    
    if (!confirm(`${imageName} görselini kalıcı olarak silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`)) return

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/site-images/${key}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        await fetchImages()
        showSuccess(`${imageName} başarıyla silindi`)
      } else {
        const errorData = await res.json()
        showError(errorData.error || 'Görsel silinirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error deleting site image:', error)
      showError('Görsel silinirken bir hata oluştu. Lütfen tekrar deneyin.')
    }
  }

  const locations = [
    { value: 'all', label: 'Tümü' },
    { value: 'concepts-page', label: 'Konseptler Sayfası' },
    { value: 'about-section', label: 'Hakkımızda' },
  ]

  // Konsept kartları için önceden tanımlı key'ler
  const conceptCardKeys = [
    { key: 'concept-hikaye-kapak', title: 'Hikaye Konsepti Kapak', description: 'Konseptler sayfasındaki "Hikaye Konsepti" kartının kapak fotoğrafı' },
    { key: 'concept-fincan-kardesligi-kapak', title: 'Fincan Kardeşliği Kapak', description: 'Konseptler sayfasındaki "Fincan Kardeşliği" kartının kapak fotoğrafı' },
  ]

  // Hakkımızda sayfası için önceden tanımlı key'ler
  const aboutPageKeys = [
    { key: 'about-hero', title: 'Hakkımızda Hero Görseli', description: 'Hakkımızda sayfasının üst kısmındaki ana görsel' },
    { key: 'about-image-1', title: 'Hakkımızda Görsel 1', description: 'Hakkımızda sayfasında kullanılacak ek görsel 1' },
    { key: 'about-image-2', title: 'Hakkımızda Görsel 2', description: 'Hakkımızda sayfasında kullanılacak ek görsel 2' },
  ]

  // Hızlı düzenleme fonksiyonu (konsept ve hakkımızda için)
  const handleQuickEditConcept = (imageKey: string) => {
    const existing = images.find(img => img.key === imageKey)
    if (existing) {
      setEditingImage(existing)
      setShowForm(true)
    } else {
      // Yeni oluştur - location'ı key'e göre belirle
      let location = 'concepts-page'
      let description = ''
      let altText = ''
      
      // Konsept kartı mı?
      const concept = conceptCardKeys.find(c => c.key === imageKey)
      if (concept) {
        location = 'concepts-page'
        description = concept.description
        altText = concept.title
      }
      // Hakkımızda mı?
      else {
        const aboutKey = aboutPageKeys.find(a => a.key === imageKey)
        if (aboutKey) {
          location = 'about-section'
          description = aboutKey.description
          altText = aboutKey.title
        }
      }
      
      setEditingImage({
        _id: '',
        key: imageKey,
        imageUrl: '',
        location,
        description,
        altText,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      })
      setShowForm(true)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="animate-spin text-gold-500 mx-auto mb-4" size={40} />
        <p className="text-charcoal-900 font-medium mb-1">Görseller yükleniyor...</p>
        <p className="text-sm text-charcoal-500">Lütfen bekleyin</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-semibold text-charcoal-900">
          Site Görselleri Yönetimi
        </h2>
        <p className="text-sm text-charcoal-600 mt-2">
          Sitenin tüm görsellerini ve arka planlarını yönetin.
        </p>
      </div>

      {/* Alt Başlıklar */}
      <div className="mb-6 border-b border-charcoal-900/10">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveSubTab('site-images')}
            className={`px-6 py-3 font-medium premium-transition ${
              activeSubTab === 'site-images'
                ? 'border-b-2 border-charcoal-900 text-charcoal-900'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Site Görselleri
          </button>
          <button
            onClick={() => setActiveSubTab('backgrounds')}
            className={`px-6 py-3 font-medium premium-transition ${
              activeSubTab === 'backgrounds'
                ? 'border-b-2 border-charcoal-900 text-charcoal-900'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Arkaplan Görselleri
          </button>
        </div>
      </div>

      {/* Site Görselleri İçeriği */}
      {activeSubTab === 'site-images' && (
        <>
          {/* Üst Kontrol Paneli */}
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Location Filter */}
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <button
                  key={loc.value}
                  onClick={() => setSelectedLocation(loc.value)}
                  className={`px-4 py-2 rounded-lg premium-transition text-sm font-medium ${
                    selectedLocation === loc.value
                      ? 'bg-charcoal-900 text-cream-50 shadow-md'
                      : 'bg-white text-charcoal-900 border border-charcoal-900/20 hover:bg-charcoal-50 hover:border-charcoal-900/40'
                  }`}
                  aria-label={`${loc.label} görsellerini göster`}
                  aria-pressed={selectedLocation === loc.value}
                >
                  {loc.label}
                </button>
              ))}
            </div>
            
            {/* Yeni Görsel Butonu */}
            <button
              onClick={() => {
                setEditingImage(null)
                setShowForm(true)
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-charcoal-900 text-cream-50 rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900 shadow-md font-medium"
              aria-label="Yeni görsel ekle"
            >
              <Plus size={18} />
              Yeni Görsel
            </button>
          </div>

          {/* Hızlı Erişim Bölümü - Sadece site görselleri için */}
          {(selectedLocation === 'all' || selectedLocation === 'concepts-page' || selectedLocation === 'about-section') && (
            <div className="mb-8 p-6 bg-gradient-to-br from-cream-50 to-gold-50/30 border border-gold-200/50 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-serif font-semibold text-charcoal-900 mb-1">Hızlı Erişim</h3>
                  <p className="text-xs text-charcoal-500">Önemli görseller için hızlı yönetim</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Konsept Kartları */}
                {(selectedLocation === 'concepts-page' || selectedLocation === 'all') && 
                  conceptCardKeys.map((concept) => {
                    const existing = images.find(img => img.key === concept.key)
                    return (
                      <div
                        key={concept.key}
                        className="bg-white rounded-lg border border-charcoal-900/10 p-4 shadow-sm hover:shadow-md premium-transition"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-charcoal-900 mb-1">{concept.title}</h4>
                            <p className="text-xs text-charcoal-500 line-clamp-2">{concept.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          {existing ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded font-medium">
                              ✓ Mevcut
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded font-medium">
                              ⚠ Eksik
                            </span>
                          )}
                          <button
                            onClick={() => handleQuickEditConcept(concept.key)}
                            className="px-3 py-1.5 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition text-xs font-medium"
                          >
                            {existing ? 'Düzenle' : 'Ekle'}
                          </button>
                        </div>
                      </div>
                    )
                  })
                }

                {/* Hakkımızda */}
                {(selectedLocation === 'about-section' || selectedLocation === 'all') && 
                  aboutPageKeys.map((aboutKey) => {
                    const existing = images.find(img => img.key === aboutKey.key)
                    return (
                      <div
                        key={aboutKey.key}
                        className="bg-white rounded-lg border border-charcoal-900/10 p-4 shadow-sm hover:shadow-md premium-transition"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-charcoal-900 mb-1">{aboutKey.title}</h4>
                            <p className="text-xs text-charcoal-500 line-clamp-2">{aboutKey.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          {existing ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded font-medium">
                              ✓ Mevcut
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded font-medium">
                              ⚠ Eksik
                            </span>
                          )}
                          <button
                            onClick={() => handleQuickEditConcept(aboutKey.key)}
                            className="px-3 py-1.5 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition text-xs font-medium"
                          >
                            {existing ? 'Düzenle' : 'Ekle'}
                          </button>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          )}

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-serif font-semibold text-charcoal-900">
                    {editingImage ? 'Görseli Düzenle' : 'Yeni Görsel Ekle'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowForm(false)
                      setEditingImage(null)
                    }}
                    className="text-charcoal-400 hover:text-charcoal-900"
                  >
                    <X size={24} />
                  </button>
                </div>

                <SiteImageForm
                  image={editingImage}
                  onSave={async (data) => {
                    await handleSave(data.key, data.imageUrl, data.location, data.description, data.altText)
                  }}
                  onClose={() => {
                    setShowForm(false)
                    setEditingImage(null)
                  }}
                />
              </div>
            </div>
          )}

          {/* Images Grid */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-serif font-semibold text-charcoal-900">Tüm Görseller</h3>
                <p className="text-xs text-charcoal-500 mt-1">
                  {images.length > 0 
                    ? `${images.length} görsel bulundu` 
                    : 'Henüz görsel eklenmemiş'}
                </p>
              </div>
              {images.length > 0 && (
                <span className="px-3 py-1 bg-charcoal-100 text-charcoal-700 rounded-lg text-sm font-medium">
                  {images.length} {images.length === 1 ? 'görsel' : 'görsel'}
                </span>
              )}
            </div>
            
            {images.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-charcoal-200">
                <div className="max-w-md mx-auto">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-cream-100 rounded-full mb-4">
                    <ImageIcon size={40} className="text-charcoal-300" />
                  </div>
                  <h4 className="text-lg font-semibold text-charcoal-900 mb-2">Henüz görsel eklenmemiş</h4>
                  <p className="text-sm text-charcoal-600 mb-6">
                    {selectedLocation === 'all' 
                      ? 'Siteniz için görseller ekleyerek başlayın'
                      : selectedLocation === 'concepts-page'
                      ? 'Konseptler sayfası için görseller ekleyin'
                      : 'Hakkımızda sayfası için görseller ekleyin'}
                  </p>
                  <button
                    onClick={() => {
                      setEditingImage(null)
                      setShowForm(true)
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition font-medium"
                  >
                    <Plus size={20} />
                    İlk Görseli Ekle
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {images.map((image) => (
                  <div
                    key={image._id}
                    className="bg-white rounded-lg overflow-hidden border border-charcoal-900/10 shadow-sm hover:shadow-lg premium-transition group"
                  >
                    <div className="relative h-48 bg-cream-200 overflow-hidden">
                      {image.imageUrl ? (
                        <Image
                          src={image.imageUrl}
                          alt={image.altText || image.key}
                          fill
                          className="object-cover group-hover:scale-105 premium-transition"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-charcoal-400 bg-cream-100">
                          <ImageIcon size={48} />
                        </div>
                      )}
                      {!image.isActive && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded font-medium">
                          Pasif
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-charcoal-900 mb-2 text-sm line-clamp-1" title={image.key}>
                        {image.key}
                      </h4>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-block px-2 py-1 bg-charcoal-100 text-charcoal-700 rounded text-xs font-medium">
                          {image.location === 'concepts-page' ? 'Konseptler' : image.location === 'about-section' ? 'Hakkımızda' : image.location}
                        </span>
                        {image.isActive ? (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            Pasif
                          </span>
                        )}
                      </div>
                      {image.description && (
                        <p className="text-sm text-charcoal-600 mb-3 line-clamp-2">{image.description}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingImage(image)
                            setShowForm(true)
                          }}
                          className="flex-1 px-3 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition text-sm font-medium flex items-center justify-center gap-1.5"
                          aria-label={`${image.key} görselini düzenle`}
                        >
                          <Edit size={16} />
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(image.key)}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 premium-transition text-sm flex items-center justify-center"
                          aria-label={`${image.key} görselini sil`}
                          title="Görseli sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Arkaplan Görselleri İçeriği */}
      {activeSubTab === 'backgrounds' && (
        <BackgroundManagementContent />
      )}
    </div>
  )
}

// Form Component
function SiteImageForm({
  image,
  onSave,
  onClose,
}: {
  image: SiteImage | null
  onSave: (data: { key: string; imageUrl: string; location: string; description?: string; altText?: string }) => Promise<void>
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    key: image?.key || '',
    imageUrl: image?.imageUrl || '',
    location: image?.location || 'concepts-page',
    description: image?.description || '',
    altText: image?.altText || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.key.trim() || !formData.imageUrl.trim() || !formData.location.trim()) {
      setError('Lütfen tüm zorunlu alanları doldurun: Key, görsel URL ve konum')
      return
    }

    // Key validasyonu
    if (!/^[a-z0-9-]+$/.test(formData.key)) {
      setError('Key sadece küçük harf, rakam ve tire içerebilir')
      return
    }

    setSaving(true)
    try {
      await onSave(formData)
    } catch (err: any) {
      setError(err.message || 'Kaydetme sırasında bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-charcoal-900 mb-2">
          Key (Benzersiz Anahtar) *
        </label>
        <input
          type="text"
          value={formData.key}
          onChange={(e) => setFormData({ ...formData, key: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') })}
          placeholder="concept-hikaye-kapak"
          required
          disabled={!!image}
          className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:bg-charcoal-100 disabled:cursor-not-allowed"
          aria-label="Görsel anahtarı (key)"
          aria-describedby="key-help"
        />
        <p id="key-help" className="text-xs text-charcoal-500 mt-1">
          {image ? 'Key değiştirilemez' : 'Benzersiz bir anahtar girin (örn: concept-hikaye-kapak). Boşluklar otomatik olarak tire ile değiştirilir.'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-charcoal-900 mb-2">
          Location (Konum) *
        </label>
        <select
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          required
          className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white"
          aria-label="Görsel konumu seçin"
        >
          <option value="concepts-page">Konseptler Sayfası</option>
          <option value="about-section">Hakkımızda</option>
        </select>
        <p className="text-xs text-charcoal-500 mt-1">
          Görselin kullanılacağı sayfa veya bölümü seçin
        </p>
      </div>

      <div>
        <ImageManager
          key={formData.key || 'new-image'}
          location={formData.location}
          label="Görsel"
          description="Görseli yükleyin veya URL girin"
          currentImageUrl={formData.imageUrl}
          onImageChange={(url) => setFormData({ ...formData, imageUrl: url })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-charcoal-900 mb-2">
          Açıklama
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-charcoal-900 mb-2">
          Alt Text (SEO)
        </label>
        <input
          type="text"
          value={formData.altText}
          onChange={(e) => setFormData({ ...formData, altText: e.target.value })}
          placeholder="Görsel için açıklayıcı metin"
          className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg" role="alert">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-charcoal-900/10">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 px-6 py-3 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Plus size={18} />
              {image ? 'Güncelle' : 'Kaydet'}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-3 bg-charcoal-100 text-charcoal-900 rounded-lg hover:bg-charcoal-200 premium-transition font-medium"
          disabled={saving}
        >
          İptal
        </button>
      </div>
    </form>
  )
}

