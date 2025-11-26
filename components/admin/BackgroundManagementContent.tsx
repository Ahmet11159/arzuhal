'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Loader2, X, Image as ImageIcon, Home, FileText, Mail, Info } from 'lucide-react'
import ImageManager from './ImageManager'
import Image from 'next/image'
import { useToast } from '@/hooks/useToast'

interface Background {
  _id: string
  key: string
  imageUrl: string
  page: string
  section: string
  description?: string
  altText?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Sayfa ve bölüm tanımlamaları
const pageSections = {
  home: [
    { key: 'hero', label: 'Hero Bölümü', description: 'Ana sayfanın en üstündeki hero bölümü arka planı' },
    { key: 'brand-message', label: 'Değerler Bölümü', description: 'Ana sayfadaki "Değerlerimiz" bölümü arka planı' },
    { key: 'categories', label: 'Kategoriler Bölümü', description: 'Ana sayfadaki "Kategoriler" bölümü arka planı' },
    { key: 'concepts', label: 'Konseptler Bölümü', description: 'Ana sayfadaki "Konseptler" bölümü arka planı' },
  ],
  about: [
    { key: 'main', label: 'Ana Bölüm', description: 'Hakkımızda sayfasının ana bölümü arka planı' },
  ],
  contact: [
    { key: 'main', label: 'Ana Bölüm', description: 'İletişim sayfasının ana bölümü arka planı' },
  ],
  products: [
    { key: 'main', label: 'Ana Bölüm', description: 'Ürünler sayfasının ana bölümü arka planı' },
  ],
  concepts: [
    { key: 'main', label: 'Ana Bölüm', description: 'Konseptler sayfasının ana bölümü arka planı' },
  ],
}

const pageIcons: Record<string, any> = {
  home: Home,
  about: Info,
  contact: Mail,
  products: FileText,
  concepts: FileText,
}

export default function BackgroundManagementContent() {
  const [backgrounds, setBackgrounds] = useState<Background[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBackground, setEditingBackground] = useState<Background | null>(null)
  const [selectedPage, setSelectedPage] = useState<string>('home')
  const { error: showError, success: showSuccess } = useToast()

  useEffect(() => {
    fetchBackgrounds()
  }, [selectedPage])

  const fetchBackgrounds = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('admin_token')
      const url = selectedPage === 'all'
        ? '/api/backgrounds'
        : `/api/backgrounds?page=${selectedPage}`
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      })

      if (!res.ok) {
        throw new Error('Arka planlar yüklenemedi')
      }

      const data = await res.json()
      setBackgrounds(data.success === false ? [] : (data.data || []))
    } catch (error) {
      console.error('Error fetching backgrounds:', error)
      setBackgrounds([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (key: string, imageUrl: string, page: string, section: string, description?: string, altText?: string) => {
    try {
      const token = localStorage.getItem('admin_token')
      
      // Mevcut arka plan var mı kontrol et
      const existing = backgrounds.find(bg => bg.key === key)
      
      const url = existing
        ? `/api/backgrounds/${key}`
        : '/api/backgrounds'
      
      const method = existing ? 'PUT' : 'POST'
      
      const body = existing
        ? { imageUrl, page, section, description, altText }
        : { key, imageUrl, location: 'background', page, section, description, altText, isActive: true }

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
        throw new Error(errorData.error || 'Arka plan kaydedilemedi')
      }

      await fetchBackgrounds()
      setShowForm(false)
      setEditingBackground(null)
      showSuccess('Arka plan başarıyla kaydedildi')
    } catch (error: any) {
      console.error('Error saving background:', error)
      showError(error.message || 'Arka plan kaydedilemedi')
      throw error
    }
  }

  const handleDelete = async (key: string) => {
    if (!confirm('Bu arka planı silmek istediğinizden emin misiniz?')) return

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/backgrounds/${key}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        await fetchBackgrounds()
        showSuccess('Arka plan başarıyla silindi')
      } else {
        const errorData = await res.json()
        showError(errorData.error || 'Arka plan silinirken bir hata oluştu')
      }
    } catch (error) {
      console.error('Error deleting background:', error)
      showError('Arka plan silinirken bir hata oluştu')
    }
  }

  const handleQuickEdit = (page: string, section: string) => {
    const key = `bg-${page}-${section}`
    const existing = backgrounds.find(bg => bg.key === key)
    const sectionInfo = pageSections[page as keyof typeof pageSections]?.find(s => s.key === section)
    
    if (existing) {
      setEditingBackground(existing)
      setShowForm(true)
    } else {
      setEditingBackground({
        _id: '',
        key,
        imageUrl: '',
        page,
        section,
        description: sectionInfo?.description || '',
        altText: sectionInfo?.label || '',
        isActive: true,
        createdAt: '',
        updatedAt: '',
      })
      setShowForm(true)
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
    <>
      {/* Sayfa Filtresi */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {Object.keys(pageSections).map((page) => {
          const Icon = pageIcons[page] || FileText
          return (
            <button
              key={page}
              onClick={() => setSelectedPage(page)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg premium-transition text-sm ${
                selectedPage === page
                  ? 'bg-charcoal-900 text-cream-50'
                  : 'bg-white text-charcoal-900 border border-charcoal-900/20 hover:bg-charcoal-900 hover:text-cream-50'
              }`}
            >
              <Icon size={16} />
              {page === 'home' ? 'Ana Sayfa' : page === 'about' ? 'Hakkımızda' : page === 'contact' ? 'İletişim' : page === 'products' ? 'Ürünler' : 'Konseptler'}
            </button>
          )
        })}
      </div>

      {/* Hızlı Erişim */}
      {selectedPage !== 'all' && pageSections[selectedPage as keyof typeof pageSections] && (
        <div className="mb-6 p-4 bg-gradient-to-br from-gold-50 to-cream-50 border border-gold-200 rounded-lg">
          <h3 className="text-sm font-semibold text-charcoal-900 mb-3">
            {selectedPage === 'home' ? 'Ana Sayfa' : selectedPage === 'about' ? 'Hakkımızda' : selectedPage === 'contact' ? 'İletişim' : selectedPage === 'products' ? 'Ürünler' : 'Konseptler'} - Hızlı Erişim
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {pageSections[selectedPage as keyof typeof pageSections].map((section) => {
              const key = `bg-${selectedPage}-${section.key}`
              const existing = backgrounds.find(bg => bg.key === key)
              return (
                <div
                  key={section.key}
                  className="flex flex-col p-3 bg-white rounded-lg border border-charcoal-900/10"
                >
                  <div className="flex-1 mb-3">
                    <h4 className="text-sm font-medium text-charcoal-900">{section.label}</h4>
                    <p className="text-xs text-charcoal-500 mt-1">{section.description}</p>
                    {existing ? (
                      <span className="inline-block mt-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                        Arka plan mevcut
                      </span>
                    ) : (
                      <span className="inline-block mt-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                        Arka plan eklenmemiş
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleQuickEdit(selectedPage, section.key)}
                    className="w-full px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition text-sm"
                  >
                    {existing ? 'Düzenle' : 'Ekle'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif font-semibold text-charcoal-900">
                {editingBackground ? 'Arka Planı Düzenle' : 'Yeni Arka Plan Ekle'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingBackground(null)
                }}
                className="text-charcoal-400 hover:text-charcoal-900"
              >
                <X size={24} />
              </button>
            </div>

            <BackgroundForm
              background={editingBackground}
              onSave={async (data) => {
                await handleSave(data.key, data.imageUrl, data.page, data.section, data.description, data.altText)
              }}
              onClose={() => {
                setShowForm(false)
                setEditingBackground(null)
              }}
            />
          </div>
        </div>
      )}

      {/* Backgrounds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {backgrounds.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-charcoal-600">Henüz arka plan eklenmemiş</p>
          </div>
        ) : (
          backgrounds.map((background) => (
            <div
              key={background._id}
              className="bg-white rounded-lg overflow-hidden border border-charcoal-900/10 premium-hover"
            >
              <div className="relative h-48 bg-cream-200">
                {background.imageUrl ? (
                  <Image
                    src={background.imageUrl}
                    alt={background.altText || background.key}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-charcoal-400">
                    <ImageIcon size={48} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-charcoal-900 mb-1">{background.key}</h4>
                <p className="text-xs text-charcoal-500 mb-2">
                  {background.page} / {background.section}
                </p>
                {background.description && (
                  <p className="text-sm text-charcoal-600 mb-2 line-clamp-2">{background.description}</p>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      setEditingBackground(background)
                      setShowForm(true)
                    }}
                    className="flex-1 px-3 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition text-sm"
                  >
                    <Edit size={16} className="inline mr-1" />
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDelete(background.key)}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 premium-transition text-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

// Form Component
function BackgroundForm({
  background,
  onSave,
  onClose,
}: {
  background: Background | null
  onSave: (data: { key: string; imageUrl: string; page: string; section: string; description?: string; altText?: string }) => Promise<void>
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    key: background?.key || '',
    imageUrl: background?.imageUrl || '',
    page: background?.page || 'home',
    section: background?.section || 'hero',
    description: background?.description || '',
    altText: background?.altText || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.key.trim() || !formData.imageUrl.trim() || !formData.page.trim() || !formData.section.trim()) {
      setError('Key, görsel URL, sayfa ve bölüm zorunludur')
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
          onChange={(e) => setFormData({ ...formData, key: e.target.value })}
          placeholder="bg-home-hero"
          required
          disabled={!!background}
          className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:bg-charcoal-100"
        />
        <p className="text-xs text-charcoal-500 mt-1">
          {background ? 'Key değiştirilemez' : 'Benzersiz bir anahtar girin (örn: bg-home-hero)'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-charcoal-900 mb-2">
            Sayfa *
          </label>
          <select
            value={formData.page}
            onChange={(e) => {
              setFormData({ ...formData, page: e.target.value, section: 'hero' })
            }}
            required
            className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="home">Ana Sayfa</option>
            <option value="about">Hakkımızda</option>
            <option value="contact">İletişim</option>
            <option value="products">Ürünler</option>
            <option value="concepts">Konseptler</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal-900 mb-2">
            Bölüm *
          </label>
          <select
            value={formData.section}
            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            required
            className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            {pageSections[formData.page as keyof typeof pageSections]?.map((section) => (
              <option key={section.key} value={section.key}>
                {section.label}
              </option>
            )) || <option value="main">Ana Bölüm</option>}
          </select>
        </div>
      </div>

      <div>
        <ImageManager
          key={formData.key || 'new-background'}
          location="background"
          label="Arka Plan Görseli"
          description="Arka plan görselini yükleyin veya URL girin"
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
          placeholder="Arka plan için açıklayıcı metin"
          className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 px-6 py-3 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-3 bg-charcoal-100 text-charcoal-900 rounded-lg hover:bg-charcoal-200 premium-transition"
        >
          İptal
        </button>
      </div>
    </form>
  )
}


