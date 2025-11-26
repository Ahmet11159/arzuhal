'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Loader2, X, CheckCircle2, Info, AlertTriangle, CheckCircle, Tag } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { shouldShowAdminError } from '@/lib/admin-error-handler'

const announcementSchema = z.object({
  title: z.string().min(1, 'Başlık gereklidir').max(200, 'Başlık en fazla 200 karakter olabilir'),
  message: z.string().min(1, 'Mesaj gereklidir').max(500, 'Mesaj en fazla 500 karakter olabilir'),
  type: z.enum(['info', 'warning', 'success', 'promotion']).default('info'),
  link: z.string().url('Geçerli bir URL giriniz').optional().or(z.literal('')),
  linkText: z.string().max(50, 'Link metni en fazla 50 karakter olabilir').optional(),
  isActive: z.boolean().default(true),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine(
  (data) => {
    if (data.endDate && data.startDate) {
      return new Date(data.endDate) >= new Date(data.startDate)
    }
    return true
  },
  {
    message: 'Bitiş tarihi başlangıç tarihinden önce olamaz',
    path: ['endDate'],
  }
)

type AnnouncementFormData = z.infer<typeof announcementSchema>

interface Announcement {
  _id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'promotion'
  link?: string
  linkText?: string
  isActive: boolean
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

const typeConfig = {
  info: { icon: Info, color: 'bg-blue-50 border-blue-200 text-blue-800', iconColor: 'text-blue-600' },
  warning: { icon: AlertTriangle, color: 'bg-yellow-50 border-yellow-200 text-yellow-800', iconColor: 'text-yellow-600' },
  success: { icon: CheckCircle, color: 'bg-green-50 border-green-200 text-green-800', iconColor: 'text-green-600' },
  promotion: { icon: Tag, color: 'bg-gold-50 border-gold-200 text-gold-800', iconColor: 'text-gold-600' },
}

export default function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { success, error: showError } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      message: '',
      type: 'info',
      link: '',
      linkText: '',
      isActive: true,
      startDate: '',
      endDate: '',
    },
  })

  const watchedType = watch('type')

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements?includeInactive=true', {
        cache: 'no-store',
      })
      const data = await res.json()
      
      if (data.success) {
        setAnnouncements(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching announcements:', err)
      showError('Duyurular yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: AnnouncementFormData) => {
    try {
      const url = editingAnnouncement
        ? `/api/announcements/${editingAnnouncement._id}`
        : '/api/announcements'
      const method = editingAnnouncement ? 'PUT' : 'POST'

      const token = localStorage.getItem('admin_token')
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          link: data.link || undefined,
          linkText: data.linkText || undefined,
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
        }),
      })

      const result = await res.json()

      console.log('API Response:', { ok: res.ok, status: res.status, result })

      if (res.ok && result.success) {
        console.log('✅ Başarılı - Toast gösteriliyor')
        success(
          editingAnnouncement
            ? 'Duyuru başarıyla güncellendi'
            : 'Duyuru başarıyla oluşturuldu'
        )
        setSuccessMessage(
          editingAnnouncement
            ? 'Duyuru başarıyla güncellendi'
            : 'Duyuru başarıyla oluşturuldu'
        )
        setTimeout(() => setSuccessMessage(null), 3000)
        reset()
        setShowForm(false)
        setEditingAnnouncement(null)
        fetchAnnouncements()
      } else {
        // Admin sayfasındayken "admin yetkisi gereklidir" mesajını gösterme
        if (shouldShowAdminError(result.message)) {
          showError(result.message || 'Bir hata oluştu')
        }
      }
    } catch (err: any) {
      console.error('Error saving announcement:', err)
      showError('Duyuru kaydedilirken bir hata oluştu')
    }
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setValue('title', announcement.title)
    setValue('message', announcement.message)
    setValue('type', announcement.type)
    setValue('link', announcement.link || '')
    setValue('linkText', announcement.linkText || '')
    setValue('isActive', announcement.isActive)
    setValue(
      'startDate',
      announcement.startDate
        ? new Date(announcement.startDate).toISOString().split('T')[0]
        : ''
    )
    setValue(
      'endDate',
      announcement.endDate
        ? new Date(announcement.endDate).toISOString().split('T')[0]
        : ''
    )
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu duyuruyu silmek istediğinizden emin misiniz?')) return

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await res.json()

      if (result.success) {
        success('Duyuru başarıyla silindi')
        fetchAnnouncements()
      } else {
        // Admin sayfasındayken "admin yetkisi gereklidir" mesajını gösterme
        if (shouldShowAdminError(result.message)) {
          showError(result.message || 'Bir hata oluştu')
        }
      }
    } catch (err: any) {
      console.error('Error deleting announcement:', err)
      showError('Duyuru silinirken bir hata oluştu')
    }
  }

  const handleCancel = () => {
    reset()
    setShowForm(false)
    setEditingAnnouncement(null)
  }

  const getTypeConfig = (type: string) => {
    return typeConfig[type as keyof typeof typeConfig] || typeConfig.info
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
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-serif font-semibold text-charcoal-900">
          Duyuru Yönetimi
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900"
          >
            <Plus size={18} />
            Yeni Duyuru Ekle
          </button>
        )}
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="text-green-600" size={20} />
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-8 glass-medium rounded-2xl shadow-depth-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-serif font-semibold text-charcoal-900">
              {editingAnnouncement ? 'Duyuru Düzenle' : 'Yeni Duyuru Ekle'}
            </h3>
            <button
              onClick={handleCancel}
              className="text-charcoal-400 hover:text-charcoal-900 premium-transition"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal-900 mb-2">
                Başlık <span className="text-red-500">*</span>
              </label>
              <input
                {...register('title')}
                type="text"
                className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="Duyuru başlığı"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal-900 mb-2">
                Mesaj <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('message')}
                rows={4}
                className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none"
                placeholder="Duyuru mesajı"
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Tip <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('type')}
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                >
                  <option value="info">Bilgi</option>
                  <option value="warning">Uyarı</option>
                  <option value="success">Başarı</option>
                  <option value="promotion">Promosyon</option>
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Link URL
                </label>
                <input
                  {...register('link')}
                  type="url"
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  placeholder="https://..."
                />
                {errors.link && (
                  <p className="mt-1 text-sm text-red-600">{errors.link.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal-900 mb-2">
                Link Metni
              </label>
              <input
                {...register('linkText')}
                type="text"
                className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="Örn: Daha Fazla Bilgi"
                maxLength={50}
              />
              {errors.linkText && (
                <p className="mt-1 text-sm text-red-600">{errors.linkText.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Başlangıç Tarihi
                </label>
                <input
                  {...register('startDate')}
                  type="datetime-local"
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Bitiş Tarihi
                </label>
                <input
                  {...register('endDate')}
                  type="datetime-local"
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                {...register('isActive')}
                type="checkbox"
                id="isActive"
                className="w-4 h-4 text-gold-500 border-charcoal-900/20 rounded focus:ring-gold-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-charcoal-900">
                Aktif
              </label>
            </div>

            {/* Preview */}
            {watch('title') && watch('message') && (
              <div className="mt-6 p-4 border border-charcoal-900/20 rounded-lg">
                <p className="text-sm font-medium text-charcoal-900 mb-3">Önizleme:</p>
                <div className={`p-4 rounded-lg border ${getTypeConfig(watchedType).color}`}>
                  <div className="flex items-start gap-3">
                    {(() => {
                      const Icon = getTypeConfig(watchedType).icon
                      return <Icon className={`${getTypeConfig(watchedType).iconColor} flex-shrink-0`} size={20} />
                    })()}
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{watch('title')}</h4>
                      <p className="text-sm mb-2">{watch('message')}</p>
                      {watch('link') && (
                        <a
                          href={watch('link')}
                          className="text-sm font-medium underline"
                        >
                          {watch('linkText') || 'Daha Fazla Bilgi'}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-charcoal-900 text-cream-50 font-medium rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    Kaydediliyor...
                  </span>
                ) : (
                  editingAnnouncement ? 'Güncelle' : 'Kaydet'
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 border-2 border-charcoal-900/20 text-charcoal-900 font-medium rounded-lg premium-transition hover:bg-charcoal-900/5"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-12 glass-medium rounded-2xl">
            <p className="text-charcoal-600">Henüz duyuru eklenmemiş.</p>
          </div>
        ) : (
          announcements.map((announcement) => {
            const config = getTypeConfig(announcement.type)
            const Icon = config.icon
            return (
              <div
                key={announcement._id}
                className={`rounded-2xl border p-6 ${config.color} hover:shadow-depth-md premium-transition`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`${config.iconColor} flex-shrink-0 mt-1`} size={24} />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{announcement.title}</h3>
                      <p className="text-sm mb-2">{announcement.message}</p>
                      {announcement.link && (
                        <a
                          href={announcement.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium underline"
                        >
                          {announcement.linkText || 'Daha Fazla Bilgi'}
                        </a>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs opacity-75">
                        {announcement.startDate && (
                          <span>
                            Başlangıç: {new Date(announcement.startDate).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                        {announcement.endDate && (
                          <span>
                            Bitiş: {new Date(announcement.endDate).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                        {!announcement.isActive && (
                          <span className="px-2 py-1 bg-white/50 rounded">Pasif</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="p-2 bg-white/50 hover:bg-white/80 rounded-lg premium-transition"
                      aria-label="Düzenle"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(announcement._id)}
                      className="p-2 bg-white/50 hover:bg-white/80 rounded-lg premium-transition"
                      aria-label="Sil"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

