'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Loader2, X, CheckCircle2, Star } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import Image from 'next/image'

const testimonialSchema = z.object({
  name: z.string().min(1, 'İsim gereklidir').max(100, 'İsim en fazla 100 karakter olabilir'),
  title: z.string().max(200, 'Başlık en fazla 200 karakter olabilir').optional(),
  content: z.string().min(1, 'İçerik gereklidir').max(1000, 'İçerik en fazla 1000 karakter olabilir'),
  rating: z.number().min(1, 'Değerlendirme en az 1 olmalıdır').max(5, 'Değerlendirme en fazla 5 olmalıdır'),
  imageUrl: z.string().url('Geçerli bir URL giriniz').optional().or(z.literal('')),
  order: z.number().min(0, 'Sıra 0 veya daha büyük olmalıdır').default(0),
  isActive: z.boolean().default(true),
})

type TestimonialFormData = z.infer<typeof testimonialSchema>

interface Testimonial {
  _id: string
  name: string
  title?: string
  content: string
  rating: number
  imageUrl?: string
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function TestimonialManagement() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { success, error: showError } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<TestimonialFormData>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      name: '',
      title: '',
      content: '',
      rating: 5,
      imageUrl: '',
      order: 0,
      isActive: true,
    },
  })

  useEffect(() => {
    fetchTestimonials()
  }, [])

  const fetchTestimonials = async () => {
    try {
      const res = await fetch('/api/testimonials?includeInactive=true', {
        cache: 'no-store',
      })
      const data = await res.json()
      
      if (data.success) {
        setTestimonials(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching testimonials:', err)
      showError('Referanslar yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: TestimonialFormData) => {
    try {
      const url = editingTestimonial
        ? `/api/testimonials/${editingTestimonial._id}`
        : '/api/testimonials'
      const method = editingTestimonial ? 'PUT' : 'POST'

      const token = localStorage.getItem('admin_token')
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          imageUrl: data.imageUrl || undefined,
        }),
      })

      const result = await res.json()

      if (result.success) {
        success(
          editingTestimonial
            ? 'Referans başarıyla güncellendi'
            : 'Referans başarıyla oluşturuldu'
        )
        setSuccessMessage(
          editingTestimonial
            ? 'Referans başarıyla güncellendi'
            : 'Referans başarıyla oluşturuldu'
        )
        setTimeout(() => setSuccessMessage(null), 3000)
        reset()
        setShowForm(false)
        setEditingTestimonial(null)
        fetchTestimonials()
      } else {
        showError(result.message || 'Bir hata oluştu')
      }
    } catch (err: any) {
      console.error('Error saving testimonial:', err)
      showError('Referans kaydedilirken bir hata oluştu')
    }
  }

  const handleEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial)
    setValue('name', testimonial.name)
    setValue('title', testimonial.title || '')
    setValue('content', testimonial.content)
    setValue('rating', testimonial.rating)
    setValue('imageUrl', testimonial.imageUrl || '')
    setValue('order', testimonial.order)
    setValue('isActive', testimonial.isActive)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu referansı silmek istediğinizden emin misiniz?')) return

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/testimonials/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await res.json()

      if (result.success) {
        success('Referans başarıyla silindi')
        fetchTestimonials()
      } else {
        showError(result.message || 'Bir hata oluştu')
      }
    } catch (err: any) {
      console.error('Error deleting testimonial:', err)
      showError('Referans silinirken bir hata oluştu')
    }
  }

  const handleCancel = () => {
    reset()
    setShowForm(false)
    setEditingTestimonial(null)
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? 'fill-gold-500 text-gold-500' : 'text-charcoal-300'}
          />
        ))}
      </div>
    )
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
          Referans Yönetimi
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900"
          >
            <Plus size={18} />
            Yeni Referans Ekle
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
              {editingTestimonial ? 'Referans Düzenle' : 'Yeni Referans Ekle'}
            </h3>
            <button
              onClick={handleCancel}
              className="text-charcoal-400 hover:text-charcoal-900 premium-transition"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  İsim <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  placeholder="Müşteri adı"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Başlık/Ünvan
                </label>
                <input
                  {...register('title')}
                  type="text"
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  placeholder="Örn: CEO, Müşteri"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal-900 mb-2">
                Yorum <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('content')}
                rows={4}
                className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none"
                placeholder="Müşteri yorumu"
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Değerlendirme (1-5) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('rating', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  max="5"
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                />
                {errors.rating && (
                  <p className="mt-1 text-sm text-red-600">{errors.rating.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Sıra
                </label>
                <input
                  {...register('order', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                />
                {errors.order && (
                  <p className="mt-1 text-sm text-red-600">{errors.order.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Görsel URL
                </label>
                <input
                  {...register('imageUrl')}
                  type="url"
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  placeholder="https://..."
                />
                {errors.imageUrl && (
                  <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>
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
                  editingTestimonial ? 'Güncelle' : 'Kaydet'
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.length === 0 ? (
          <div className="col-span-full text-center py-12 glass-medium rounded-2xl">
            <p className="text-charcoal-600">Henüz referans eklenmemiş.</p>
          </div>
        ) : (
          testimonials.map((testimonial) => (
            <div
              key={testimonial._id}
              className="glass-medium rounded-2xl shadow-depth-sm p-6 hover:shadow-depth-md premium-transition flex flex-col"
            >
              <div className="flex items-start gap-4 mb-4">
                {testimonial.imageUrl ? (
                  <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={testimonial.imageUrl}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-200 via-gold-100 to-cream-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-serif font-bold text-gold-600">
                      {testimonial.name[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-charcoal-900 truncate">
                    {testimonial.name}
                  </h3>
                  {testimonial.title && (
                    <p className="text-sm text-charcoal-600 truncate">
                      {testimonial.title}
                    </p>
                  )}
                  <div className="mt-1">{renderStars(testimonial.rating)}</div>
                </div>
              </div>

              <p className="text-charcoal-700 mb-4 flex-1 line-clamp-4">
                {testimonial.content}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-charcoal-900/10">
                <div className="flex items-center gap-2 text-sm text-charcoal-500">
                  {!testimonial.isActive && (
                    <span className="px-2 py-1 bg-charcoal-900/10 text-charcoal-600 text-xs font-medium rounded">
                      Pasif
                    </span>
                  )}
                  <span>Sıra: {testimonial.order}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(testimonial)}
                    className="p-2 text-gold-600 hover:bg-gold-100 rounded-lg premium-transition"
                    aria-label="Düzenle"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(testimonial._id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg premium-transition"
                    aria-label="Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}


