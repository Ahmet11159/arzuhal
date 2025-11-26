'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Link as LinkIcon, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

interface ImageManagerProps {
  key: string // SiteImage key (örn: 'concept-hikaye-kapak')
  location: string // Görselin kullanıldığı yer (örn: 'concepts-page')
  label?: string
  description?: string
  currentImageUrl?: string
  onImageChange?: (imageUrl: string) => void
  onSave?: (imageUrl: string) => Promise<void>
  required?: boolean
}

export default function ImageManager({
  key: imageKey,
  location,
  label,
  description,
  currentImageUrl,
  onImageChange,
  onSave,
  required = false,
}: ImageManagerProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload')
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await handleFileUpload(files[0])
    }
  }, [])

  // Dosya yükleme
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Lütfen geçerli bir görsel dosyası seçin (JPG, PNG, WebP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Dosya boyutu 5MB\'dan küçük olmalıdır')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Dosya yüklenirken bir hata oluştu')
      }

      const data = await res.json()
      const imageUrl = data.url || data.imageUrl

      if (!imageUrl) {
        throw new Error('Görsel URL\'i alınamadı')
      }

      setPreviewUrl(imageUrl)
      onImageChange?.(imageUrl)

      // Otomatik kaydet
      if (onSave) {
        await saveImage(imageUrl)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Dosya yüklenirken bir hata oluştu')
    } finally {
      setUploading(false)
    }
  }

  // URL'den görsel yükleme
  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      setError('Lütfen geçerli bir URL girin')
      return
    }

    // URL validasyonu
    try {
      new URL(urlInput.trim())
    } catch {
      setError('Geçerli bir URL girin (örn: https://example.com/image.jpg)')
      return
    }

    setError(null)
    setSuccess(false)
    setPreviewUrl(urlInput.trim())
    onImageChange?.(urlInput.trim())

    // Otomatik kaydet
    if (onSave) {
      await saveImage(urlInput.trim())
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  // Görseli kaydet
  const saveImage = async (imageUrl: string) => {
    if (!onSave) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await onSave(imageUrl)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Save error:', err)
      setError(err.message || 'Görsel kaydedilirken bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  // Görseli kaldır
  const handleRemove = async () => {
    setPreviewUrl(null)
    setUrlInput('')
    onImageChange?.('')
    
    if (onSave) {
      await saveImage('')
    }
  }

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-charcoal-900">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {description && (
        <p className="text-sm text-charcoal-600">{description}</p>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-charcoal-900/10">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 text-sm font-medium premium-transition ${
            activeTab === 'upload'
              ? 'border-b-2 border-gold-500 text-gold-600'
              : 'text-charcoal-600 hover:text-charcoal-900'
          }`}
        >
          <Upload size={16} className="inline mr-2" />
          Dosya Yükle
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`px-4 py-2 text-sm font-medium premium-transition ${
            activeTab === 'url'
              ? 'border-b-2 border-gold-500 text-gold-600'
              : 'text-charcoal-600 hover:text-charcoal-900'
          }`}
        >
          <LinkIcon size={16} className="inline mr-2" />
          URL Gir
        </button>
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-all
            ${isDragging 
              ? 'border-gold-500 bg-gold-50' 
              : 'border-charcoal-900/20 hover:border-gold-300 bg-cream-50'
            }
            ${uploading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="animate-spin text-gold-500 mb-4" size={32} />
              <p className="text-sm text-charcoal-600">Yükleniyor...</p>
            </div>
          ) : previewUrl ? (
            <div className="relative">
              <div className="relative h-48 w-full rounded-lg overflow-hidden bg-cream-200 mb-4">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 premium-transition text-sm"
              >
                <X size={16} className="inline mr-2" />
                Kaldır
              </button>
            </div>
          ) : (
            <>
              <Upload className="mx-auto text-charcoal-400 mb-4" size={48} />
              <p className="text-sm text-charcoal-700 mb-2">
                Görseli sürükleyip bırakın veya tıklayın
              </p>
              <p className="text-xs text-charcoal-500 mb-4">
                JPG, PNG, WebP (Max 5MB)
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition text-sm"
              >
                Dosya Seç
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0])
                  }
                }}
              />
            </>
          )}
        </div>
      )}

      {/* URL Tab */}
      {activeTab === 'url' && (
        <div className="space-y-4">
          <div>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          
          {previewUrl && (
            <div className="relative">
              <div className="relative h-48 w-full rounded-lg overflow-hidden bg-cream-200 mb-4">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || saving}
              className="px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="inline animate-spin mr-2" size={16} />
                  Kaydediliyor...
                </>
              ) : (
                'URL\'yi Kullan'
              )}
            </button>
            {previewUrl && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 premium-transition text-sm"
              >
                <X size={16} className="inline mr-2" />
                Kaldır
              </button>
            )}
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm"
          >
            <CheckCircle size={16} />
            <span>Görsel başarıyla kaydedildi</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
