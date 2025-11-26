'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Star, Quote } from 'lucide-react'
import { logger as loggerClient } from '@/lib/logger-client'

interface Testimonial {
  _id: string
  name: string
  title?: string
  content: string
  rating: number
  imageUrl?: string
  order: number
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTestimonials()
  }, [])

  const fetchTestimonials = async () => {
    try {
      const timestamp = Date.now()
      const res = await fetch(`/api/testimonials?t=${timestamp}`, {
        cache: 'no-store',
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      
      if (data.success && data.data) {
        setTestimonials(Array.isArray(data.data) ? data.data : [])
      } else {
        setTestimonials([])
      }
    } catch (error) {
      loggerClient.error('Error fetching testimonials:', error)
      setTestimonials([])
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={18}
            className={
              star <= rating
                ? 'fill-gold-500 text-gold-500'
                : 'text-charcoal-300'
            }
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-cream-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mb-4"></div>
          <p className="text-charcoal-600">Referanslar yükleniyor...</p>
        </div>
      </section>
    )
  }

  if (testimonials.length === 0) {
    return null
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-cream-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gold-200 via-gold-100 to-cream-50 rounded-full mb-4 shadow-depth-md">
            <Quote className="text-gold-600" size={32} />
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-4">
            Müşteri Yorumları
          </h2>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            Müşterilerimizin ARZUHAL hakkındaki görüşleri
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial._id}
              className="glass-medium rounded-2xl shadow-depth-md p-6 hover:shadow-depth-lg premium-transition flex flex-col"
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
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-200 via-gold-100 to-cream-50 flex items-center justify-center flex-shrink-0 shadow-depth-sm">
                    <span className="text-2xl font-serif font-bold text-gold-600">
                      {testimonial.name[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-charcoal-900 mb-1">
                    {testimonial.name}
                  </h3>
                  {testimonial.title && (
                    <p className="text-sm text-charcoal-600 mb-2">
                      {testimonial.title}
                    </p>
                  )}
                  {renderStars(testimonial.rating)}
                </div>
              </div>

              <div className="relative mb-4 flex-1">
                <Quote
                  className="absolute -top-2 -left-2 text-gold-200"
                  size={40}
                />
                <p className="text-charcoal-700 leading-relaxed relative z-10">
                  {testimonial.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

