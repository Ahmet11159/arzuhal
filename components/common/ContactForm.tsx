'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Send, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

const contactFormSchema = z.object({
  name: z.string().min(2, 'İsim en az 2 karakter olmalıdır').max(100, 'İsim en fazla 100 karakter olabilir'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  phone: z.string().max(20, 'Telefon en fazla 20 karakter olabilir').optional().or(z.literal('')),
  subject: z.string().min(3, 'Konu en az 3 karakter olmalıdır').max(200, 'Konu en fazla 200 karakter olabilir'),
  message: z.string().min(10, 'Mesaj en az 10 karakter olmalıdır').max(2000, 'Mesaj en fazla 2000 karakter olabilir'),
  category: z.enum(['soru', 'oneri', 'destek', 'siparis', 'sikayet'], {
    errorMap: () => ({ message: 'Lütfen bir kategori seçiniz' }),
  }).optional(),
})

type ContactFormData = z.infer<typeof contactFormSchema>

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { success, error: showError } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      category: undefined,
    },
  })

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    setIsSuccess(false)

    try {
      const res = await fetch('/api/contact-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          phone: data.phone || undefined,
          category: data.category || undefined,
        }),
      })

      const result = await res.json()

      if (result.success) {
        success('Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.')
        setIsSuccess(true)
        reset()
        setTimeout(() => setIsSuccess(false), 5000)
      } else {
        showError(result.message || 'Mesaj gönderilirken bir hata oluştu')
      }
    } catch (err: any) {
      console.error('Error sending message:', err)
      showError('Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="glass-medium rounded-2xl shadow-depth-lg p-8">
      <div className="mb-6">
        <h3 className="text-2xl font-serif font-bold text-charcoal-900 mb-2">
          Bize Ulaşın
        </h3>
        <p className="text-charcoal-600">
          Sorularınız, önerileriniz veya destek talepleriniz için formu doldurun.
        </p>
      </div>

      {isSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="text-green-600" size={20} />
          <p className="text-green-800 font-medium">
            Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              İsim <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              autoComplete="name"
              className="w-full px-4 py-3 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent premium-transition min-h-[44px] touch-manipulation"
              placeholder="Adınız Soyadınız"
              aria-label="İsim"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              E-posta <span className="text-red-500">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              className="w-full px-4 py-3 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent premium-transition min-h-[44px] touch-manipulation"
              placeholder="ornek@email.com"
              aria-label="E-posta adresi"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal-900 mb-2">
            Telefon
          </label>
          <input
            {...register('phone')}
            type="tel"
            autoComplete="tel"
            className="w-full px-4 py-3 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent premium-transition min-h-[44px] touch-manipulation"
            placeholder="+90 555 123 45 67"
            aria-label="Telefon numarası"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Kategori
            </label>
            <select
              {...register('category')}
              className="w-full px-4 py-3 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent premium-transition min-h-[44px] touch-manipulation"
              aria-label="Mesaj kategorisi"
            >
              <option value="">Kategori seçin (opsiyonel)</option>
              <option value="soru">Soru</option>
              <option value="oneri">Öneri</option>
              <option value="destek">Destek</option>
              <option value="siparis">Sipariş</option>
              <option value="sikayet">Şikayet</option>
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Konu <span className="text-red-500">*</span>
            </label>
            <input
              {...register('subject')}
              type="text"
              autoComplete="off"
              className="w-full px-4 py-3 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent premium-transition min-h-[44px] touch-manipulation"
              placeholder="Mesaj konusu"
              aria-label="Mesaj konusu"
            />
            {errors.subject && (
              <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal-900 mb-2">
            Mesaj <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('message')}
            rows={6}
            className="w-full px-4 py-3 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none premium-transition touch-manipulation"
            placeholder="Mesajınızı buraya yazın..."
            aria-label="Mesaj içeriği"
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-charcoal-900 text-cream-50 font-medium rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
          aria-label="Mesajı gönder"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Gönderiliyor...
            </>
          ) : (
            <>
              <Send size={18} />
              Mesajı Gönder
            </>
          )}
        </button>
      </form>
    </div>
  )
}

