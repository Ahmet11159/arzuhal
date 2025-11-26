'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Upload, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useToast } from '@/hooks/useToast'
import { sanitizeInput } from '@/lib/utils'
import type { Product } from '@/types'

export default function ProductForm({
  product,
  onClose,
  onSave,
}: {
  product?: Product | null
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState<Partial<Product> & { name: string; description: string; category: string; material: string; dimensions: { unit: string }; collectionTags: string[]; trendyolLink: string; isActive: boolean; chapterTitle?: string }>({
    name: '',
    description: '',
    category: 'klasik',
    price: undefined,
    images: [],
    material: '',
    dimensions: {
      unit: 'cm',
    },
    collectionTags: [],
    trendyolLink: '',
    isActive: true,
    storyId: undefined,
    chapterNumber: undefined,
    chapterTitle: '',
  })
  const [loading, setLoading] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [imageInput, setImageInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stories, setStories] = useState<Array<{ _id: string; title: string }>>([])
  const [loadingStories, setLoadingStories] = useState(false)
  const [categories, setCategories] = useState<Array<{ _id: string; name: string; slug: string; isActive: boolean; order: number }>>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const { error: showError, success: showSuccess } = useToast()

  useEffect(() => {
    if (product) {
      console.log('📥 Ürün verisi yüklendi:', product)
      console.log('🔗 Trendyol Link (ham):', product.trendyolLink)
      console.log('🔗 Trendyol Link (tip):', typeof product.trendyolLink)
      setFormData({
        ...product,
        // null, undefined veya boş string durumlarını handle et
        trendyolLink: (product.trendyolLink && product.trendyolLink.trim()) ? product.trendyolLink.trim() : '',
        // storyId'yi string'e çevir (ObjectId veya populate edilmiş obje ise)
        storyId: product.storyId && product.storyId !== null
          ? (typeof product.storyId === 'object' 
              ? ((product.storyId as any)._id ? (product.storyId as any)._id.toString() : String(product.storyId))
              : String(product.storyId))
          : undefined,
      })
      console.log('🔗 Trendyol Link (formData):', (product.trendyolLink && product.trendyolLink.trim()) ? product.trendyolLink.trim() : '')
    } else {
      // Yeni ürün için formu sıfırla
      setFormData({
        name: '',
        description: '',
        category: 'klasik',
        price: undefined,
        images: [],
        material: '',
        dimensions: {
          unit: 'cm',
        },
        collectionTags: [],
        trendyolLink: '',
        isActive: true,
        storyId: undefined,
        chapterNumber: undefined,
        chapterTitle: '',
      })
    }
    fetchStories()
    fetchCategories()
  }, [product])

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true)
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/categories?includeInactive=true', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      })
      const data = await res.json()
      if (data.success) {
        setCategories(data.data || [])
      } else {
        console.error('Error fetching categories:', data.error || data.message)
        setCategories([])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories([])
    } finally {
      setLoadingCategories(false)
    }
  }

  const fetchStories = async () => {
    setLoadingStories(true)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/stories', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        setStories(data.map((story: any) => ({ _id: story._id, title: story.title })))
      }
    } catch (error) {
      console.error('Error fetching stories:', error)
    } finally {
      setLoadingStories(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('admin_token')
      const url = product?._id
        ? `/api/products/${product._id}`
        : '/api/products'
      const method = product?._id ? 'PUT' : 'POST'

      // Trendyol linkini temizle (trim ve boş kontrolü)
      // Backend'de boş string'ler null'a çevrilecek
      const submitData: any = {
        ...formData,
        trendyolLink: formData.trendyolLink?.trim() || '',
      }

      // Konsept ürünler için storyId, chapterNumber, chapterTitle işle
      if (formData.category === 'konsept') {
        // storyId string olarak gönderilmeli (MongoDB ObjectId'ye çevrilecek)
        submitData.storyId = formData.storyId && formData.storyId.toString().trim() 
          ? formData.storyId.toString().trim() 
          : null
        submitData.chapterNumber = formData.chapterNumber ? Number(formData.chapterNumber) : undefined
        submitData.chapterTitle = formData.chapterTitle?.trim() || undefined
      } else {
        // Klasik ürünler için bu alanları gönderme
        submitData.storyId = null
        submitData.chapterNumber = undefined
        submitData.chapterTitle = undefined
      }

      console.log('📤 Gönderilen veri:', submitData)
      console.log('🔗 Trendyol Link (gönderilen):', submitData.trendyolLink)
      console.log('📚 Story ID (gönderilen):', submitData.storyId)
      console.log('📖 Chapter Number (gönderilen):', submitData.chapterNumber)

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      })

      if (res.ok) {
        const updatedProduct = await res.json()
        console.log('✅ Ürün güncellendi:', updatedProduct)
        console.log('📝 Trendyol Link:', updatedProduct.trendyolLink)
        showSuccess(product ? 'Ürün başarıyla güncellendi' : 'Ürün başarıyla oluşturuldu')
        onSave()
        onClose()
      } else {
        const errorData = await res.json()
        console.error('❌ API Hatası:', errorData)
        showError(`Bir hata oluştu: ${errorData.error || res.statusText}`)
      }
    } catch (error) {
      console.error('Error saving product:', error)
      showError('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.collectionTags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        collectionTags: [...formData.collectionTags, tagInput.trim()],
      })
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      collectionTags: formData.collectionTags.filter((t) => t !== tag),
    })
  }

  const addImage = () => {
    if (imageInput.trim() && !(formData.images || []).includes(imageInput.trim())) {
      setFormData({
        ...formData,
        images: [...(formData.images || []), imageInput.trim()],
      })
      setImageInput('')
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const token = localStorage.getItem('admin_token')
    if (!token) {
      showError('Lütfen önce giriş yapın')
      return
    }

    // Birden fazla dosya yükle
    const fileArray = Array.from(files)
    
    for (const file of fileArray) {
      await uploadFile(file, token)
    }

    // Input'u temizle
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (file: File, token: string) => {
    // Dosya tipi kontrolü
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      showError(`${file.name}: Sadece JPG, PNG ve WebP formatları desteklenir`)
      return
    }

    // Dosya boyutu kontrolü (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      showError(`${file.name}: Dosya boyutu 5MB'dan küçük olmalıdır`)
      return
    }

    const fileId = `${Date.now()}-${Math.random()}`
    setUploading(true)
    setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }))

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      })

      const data = await res.json()

      if (res.ok && data.url) {
        // Görseli listeye ekle
        setFormData((prev) => {
          if (!(prev.images || []).includes(data.url)) {
            return {
              ...prev,
              images: [...(prev.images || []), data.url],
            }
          }
          return prev
        })
        showSuccess(`${file.name} başarıyla yüklendi`)
      } else {
        showError(`${file.name}: ${data.error || 'Yükleme başarısız'}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      showError(`${file.name}: Yükleme sırasında bir hata oluştu`)
    } finally {
      setUploadProgress((prev) => {
        const newProgress = { ...prev }
        delete newProgress[fileId]
        return newProgress
      })
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const token = localStorage.getItem('admin_token')
    if (!token) {
      showError('Lütfen önce giriş yapın')
      return
    }

    const fileArray = Array.from(files)
    for (const file of fileArray) {
      await uploadFile(file, token)
    }
  }

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: (formData.images || []).filter((_, i) => i !== index),
    })
  }

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...(formData.images || [])]
    if (direction === 'up' && index > 0) {
      [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]]
    } else if (direction === 'down' && index < newImages.length - 1) {
      [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]]
    }
    setFormData({
      ...formData,
      images: newImages,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-charcoal-900/10 px-6 py-4 flex justify-between items-center">
          <h3 className="text-2xl font-serif font-semibold text-charcoal-900">
            {product ? 'Ürün Düzenle' : 'Yeni Ürün'}
          </h3>
          <button onClick={onClose} className="text-charcoal-600 hover:text-charcoal-900">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Ürün Adı *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, name: sanitized })
              }}
              required
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Açıklama *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, description: sanitized })
              }}
              required
              rows={4}
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal-900 mb-2">
                Kategori *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                required
                disabled={loadingCategories}
                className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCategories ? (
                  <option>Kategoriler yükleniyor...</option>
                ) : categories.length === 0 ? (
                  <option value="">Kategori bulunamadı</option>
                ) : (
                  <>
                    <option value="">Kategori seçin...</option>
                    {categories
                      .filter((cat) => cat.isActive)
                      .sort((a, b) => a.order - b.order)
                      .map((cat) => (
                        <option key={cat._id} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal-900 mb-2">
                Fiyat (₺)
              </label>
              <input
                type="number"
                value={formData.price || ''}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Materyal *
            </label>
            <input
              type="text"
              value={formData.material}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, material: sanitized })
              }}
              required
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Boyutlar
            </label>
            <div className="grid grid-cols-4 gap-4">
              <input
                type="number"
                placeholder="Yükseklik"
                value={formData.dimensions.height || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dimensions: {
                      ...formData.dimensions,
                      height: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })
                }
                className="px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <input
                type="number"
                placeholder="Genişlik"
                value={formData.dimensions.width || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dimensions: {
                      ...formData.dimensions,
                      width: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })
                }
                className="px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <input
                type="number"
                placeholder="Derinlik"
                value={formData.dimensions.depth || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dimensions: {
                      ...formData.dimensions,
                      depth: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })
                }
                className="px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <select
                value={formData.dimensions.unit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions, unit: e.target.value },
                  })
                }
                className="px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="cm">cm</option>
                <option value="mm">mm</option>
                <option value="in">in</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Ürün Görselleri
            </label>

            {/* Dosya Yükleme Alanı */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-charcoal-900/20 rounded-lg p-6 mb-4 bg-cream-50 hover:border-gold-400 premium-transition cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-center">
                <Upload size={48} className="mx-auto text-charcoal-400 mb-3" />
                <p className="text-sm font-medium text-charcoal-900 mb-1">
                  Görselleri sürükleyip bırakın veya tıklayarak seçin
                </p>
                <p className="text-xs text-charcoal-500">
                  JPG, PNG, WebP (Max 5MB) - Birden fazla dosya seçebilirsiniz
                </p>
                {uploading && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-gold-600" />
                    <span className="text-sm text-charcoal-600">Yükleniyor...</span>
                  </div>
                )}
              </div>
            </div>

            {/* URL ile Ekleme (Opsiyonel) */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={imageInput}
                onChange={(e) => {
                  const sanitized = sanitizeInput(e.target.value)
                  setImageInput(sanitized)
                }}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                placeholder="Veya görsel URL'si ekle (opsiyonel)"
                className="flex-1 px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                onClick={addImage}
                className="px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 premium-transition flex items-center gap-2"
              >
                <Plus size={18} />
                URL Ekle
              </button>
            </div>
            
            {(formData.images || []).length > 0 && (
              <div className="space-y-3">
                {(formData.images || []).map((image, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 border border-charcoal-900/10 rounded-lg bg-cream-50"
                  >
                    <div className="relative w-20 h-20 bg-cream-200 rounded overflow-hidden flex-shrink-0">
                      {image ? (
                        <Image
                          src={image}
                          alt={`Görsel ${index + 1}`}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-image.jpg'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={24} className="text-charcoal-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-charcoal-600 truncate">{image}</p>
                      <p className="text-xs text-charcoal-400 mt-1">
                        Görsel {index + 1} {index === 0 && '(Ana Görsel)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveImage(index, 'up')}
                        disabled={index === 0}
                        className="p-2 text-charcoal-600 hover:text-charcoal-900 disabled:opacity-30 disabled:cursor-not-allowed premium-transition"
                        title="Yukarı taşı"
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(index, 'down')}
                        disabled={index === (formData.images || []).length - 1}
                        className="p-2 text-charcoal-600 hover:text-charcoal-900 disabled:opacity-30 disabled:cursor-not-allowed premium-transition"
                        title="Aşağı taşı"
                      >
                        <ArrowDown size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="p-2 text-red-600 hover:text-red-700 premium-transition"
                        title="Sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {(formData.images || []).length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-charcoal-900/20 rounded-lg bg-cream-50">
                <ImageIcon size={48} className="mx-auto text-charcoal-400 mb-2" />
                <p className="text-sm text-charcoal-600">Henüz görsel eklenmedi</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Koleksiyon Etiketleri
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => {
                  const sanitized = sanitizeInput(e.target.value)
                  setTagInput(sanitized)
                }}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Etiket ekle"
                className="flex-1 px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 premium-transition"
              >
                Ekle
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.collectionTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-sm flex items-center gap-2"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-gold-700 hover:text-gold-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Konsept Ürünler İçin Hikaye ve Bölüm Bilgileri */}
          {formData.category === 'konsept' && (
            <div className="space-y-4 p-4 bg-gold-50 rounded-lg border border-gold-200">
              <h4 className="text-sm font-semibold text-charcoal-900 mb-3">
                Hikaye Konsepti Bilgileri
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Hikaye
                </label>
                <select
                  value={
                    formData.storyId
                      ? typeof formData.storyId === 'string'
                        ? formData.storyId
                        : formData.storyId._id
                      : ''
                  }
                  onChange={(e) => setFormData({ ...formData, storyId: e.target.value || undefined })}
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  disabled={loadingStories}
                >
                  <option value="">Hikaye Seçin</option>
                  {stories.map((story) => (
                    <option key={story._id} value={story._id}>
                      {story.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-900 mb-2">
                    Bölüm Numarası
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.chapterNumber || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        chapterNumber: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="1, 2, 3..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-900 mb-2">
                    Bölüm Başlığı (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={formData.chapterTitle || ''}
                    onChange={(e) => {
                      const sanitized = sanitizeInput(e.target.value)
                      setFormData({ ...formData, chapterTitle: sanitized })
                    }}
                    className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="Örn: Gölgelerin Fısıltısı"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Trendyol Linki */}
          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Trendyol Linki (Opsiyonel)
            </label>
            <input
              type="text"
              value={formData.trendyolLink || ''}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, trendyolLink: sanitized })
              }}
              placeholder="https://www.trendyol.com/..."
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <p className="text-xs text-charcoal-500 mt-1">
              Bu ürün için Trendyol satış linki
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isActive" className="text-sm text-charcoal-900">
              Aktif
            </label>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-charcoal-900/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-charcoal-900/20 text-charcoal-900 rounded-lg hover:bg-cream-100 premium-transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 premium-transition disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

