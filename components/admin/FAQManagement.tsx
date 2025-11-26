'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Loader2, X, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

const faqSchema = z.object({
  question: z.string().min(1, 'Soru gereklidir').max(500, 'Soru en fazla 500 karakter olabilir'),
  answer: z.string().min(1, 'Cevap gereklidir').max(2000, 'Cevap en fazla 2000 karakter olabilir'),
  category: z.string().max(100, 'Kategori en fazla 100 karakter olabilir').optional(),
  order: z.number().min(0, 'Sıra 0 veya daha büyük olmalıdır').default(0),
  isActive: z.boolean().default(true),
})

type FAQFormData = z.infer<typeof faqSchema>

interface FAQ {
  _id: string
  question: string
  answer: string
  category?: string
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function FAQManagement() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { success, error: showError } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FAQFormData>({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      question: '',
      answer: '',
      category: '',
      order: 0,
      isActive: true,
    },
  })

  useEffect(() => {
    fetchFAQs()
  }, [])

  const fetchFAQs = async () => {
    try {
      const res = await fetch('/api/faqs?includeInactive=true', {
        cache: 'no-store',
      })
      const data = await res.json()
      
      if (data.success) {
        setFaqs(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching FAQs:', err)
      showError('SSS\'ler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: FAQFormData) => {
    try {
      const url = editingFAQ ? `/api/faqs/${editingFAQ._id}` : '/api/faqs'
      const method = editingFAQ ? 'PUT' : 'POST'

      const token = localStorage.getItem('admin_token')
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (result.success) {
        success(editingFAQ ? 'SSS başarıyla güncellendi' : 'SSS başarıyla oluşturuldu')
        setSuccessMessage(editingFAQ ? 'SSS başarıyla güncellendi' : 'SSS başarıyla oluşturuldu')
        setTimeout(() => setSuccessMessage(null), 3000)
        reset()
        setShowForm(false)
        setEditingFAQ(null)
        fetchFAQs()
      } else {
        showError(result.message || 'Bir hata oluştu')
      }
    } catch (err: any) {
      console.error('Error saving FAQ:', err)
      showError('SSS kaydedilirken bir hata oluştu')
    }
  }

  const handleEdit = (faq: FAQ) => {
    setEditingFAQ(faq)
    setValue('question', faq.question)
    setValue('answer', faq.answer)
    setValue('category', faq.category || '')
    setValue('order', faq.order)
    setValue('isActive', faq.isActive)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu SSS\'yi silmek istediğinizden emin misiniz?')) return

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/faqs/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await res.json()

      if (result.success) {
        success('SSS başarıyla silindi')
        fetchFAQs()
      } else {
        showError(result.message || 'Bir hata oluştu')
      }
    } catch (err: any) {
      console.error('Error deleting FAQ:', err)
      showError('SSS silinirken bir hata oluştu')
    }
  }

  const handleCancel = () => {
    reset()
    setShowForm(false)
    setEditingFAQ(null)
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
          SSS Yönetimi
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900"
          >
            <Plus size={18} />
            Yeni SSS Ekle
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
              {editingFAQ ? 'SSS Düzenle' : 'Yeni SSS Ekle'}
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
                Soru <span className="text-red-500">*</span>
              </label>
              <input
                {...register('question')}
                type="text"
                className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                placeholder="Soru metnini giriniz"
              />
              {errors.question && (
                <p className="mt-1 text-sm text-red-600">{errors.question.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal-900 mb-2">
                Cevap <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('answer')}
                rows={6}
                className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none"
                placeholder="Cevap metnini giriniz"
              />
              {errors.answer && (
                <p className="mt-1 text-sm text-red-600">{errors.answer.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Kategori
                </label>
                <input
                  {...register('category')}
                  type="text"
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  placeholder="Örn: Genel, Sipariş, Ürün"
                />
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
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
                  editingFAQ ? 'Güncelle' : 'Kaydet'
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
        {faqs.length === 0 ? (
          <div className="text-center py-12 glass-medium rounded-2xl">
            <p className="text-charcoal-600">Henüz SSS eklenmemiş.</p>
          </div>
        ) : (
          faqs.map((faq) => (
            <div
              key={faq._id}
              className="glass-medium rounded-2xl shadow-depth-sm p-6 hover:shadow-depth-md premium-transition"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-charcoal-900">
                      {faq.question}
                    </h3>
                    {faq.category && (
                      <span className="px-2 py-1 bg-gold-100 text-gold-700 text-xs font-medium rounded">
                        {faq.category}
                      </span>
                    )}
                    {!faq.isActive && (
                      <span className="px-2 py-1 bg-charcoal-900/10 text-charcoal-600 text-xs font-medium rounded">
                        Pasif
                      </span>
                    )}
                  </div>
                  <p className="text-charcoal-600 mb-2">{faq.answer}</p>
                  <div className="flex items-center gap-4 text-sm text-charcoal-500">
                    <span>Sıra: {faq.order}</span>
                    <span>
                      {new Date(faq.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(faq)}
                    className="p-2 text-gold-600 hover:bg-gold-100 rounded-lg premium-transition"
                    aria-label="Düzenle"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(faq._id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg premium-transition"
                    aria-label="Sil"
                  >
                    <Trash2 size={18} />
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


