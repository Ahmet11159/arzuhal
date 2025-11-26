'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import { logger as loggerClient } from '@/lib/logger-client'

interface FAQ {
  _id: string
  question: string
  answer: string
  category?: string
  order: number
}

export default function FAQSection() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchFAQs()
  }, [])

  const fetchFAQs = async () => {
    try {
      const timestamp = Date.now()
      const res = await fetch(`/api/faqs?t=${timestamp}`, {
        cache: 'no-store',
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      
      if (data.success && data.data) {
        setFaqs(Array.isArray(data.data) ? data.data : [])
      } else {
        setFaqs([])
      }
    } catch (error) {
      loggerClient.error('Error fetching FAQs:', error)
      setFaqs([])
    } finally {
      setLoading(false)
    }
  }

  const categories = ['all', ...Array.from(new Set(faqs.map((f) => f.category).filter((c): c is string => Boolean(c))))]

  const filteredFAQs = selectedCategory === 'all'
    ? faqs
    : faqs.filter((f) => f.category === selectedCategory)

  const toggleFAQ = (id: string) => {
    setOpenId(openId === id ? null : id)
  }

  if (loading) {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-cream-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mb-4"></div>
          <p className="text-charcoal-600">SSS'ler yükleniyor...</p>
        </div>
      </section>
    )
  }

  if (faqs.length === 0) {
    return null
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-cream-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gold-200 via-gold-100 to-cream-50 rounded-full mb-4 shadow-depth-md">
            <HelpCircle className="text-gold-600" size={32} />
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-charcoal-900 mb-4">
            Sık Sorulan Sorular
          </h2>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            Merak ettiğiniz soruların cevaplarını burada bulabilirsiniz.
          </p>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="flex gap-2 mb-8 justify-center flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category || 'all')}
                className={`px-4 py-2 rounded-lg premium-transition text-sm font-medium ${
                  selectedCategory === category
                    ? 'bg-charcoal-900 text-cream-50'
                    : 'bg-white border border-charcoal-900/20 text-charcoal-900 hover:bg-charcoal-900/5'
                }`}
              >
                {category === 'all' ? 'Tümü' : category}
              </button>
            ))}
          </div>
        )}

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12 glass-medium rounded-2xl">
              <p className="text-charcoal-600">Bu kategoride SSS bulunmuyor.</p>
            </div>
          ) : (
            filteredFAQs.map((faq) => (
              <div
                key={faq._id}
                className="glass-medium rounded-2xl shadow-depth-sm overflow-hidden premium-transition hover:shadow-depth-md"
              >
                <button
                  onClick={() => toggleFAQ(faq._id)}
                  className="w-full px-6 py-5 flex justify-between items-center gap-4 text-left premium-transition hover:bg-white/50"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-charcoal-900 mb-1">
                      {faq.question}
                    </h3>
                    {faq.category && (
                      <span className="inline-block px-2 py-1 bg-gold-100 text-gold-700 text-xs font-medium rounded">
                        {faq.category}
                      </span>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {openId === faq._id ? (
                      <ChevronUp className="text-charcoal-600" size={20} />
                    ) : (
                      <ChevronDown className="text-charcoal-600" size={20} />
                    )}
                  </div>
                </button>
                {openId === faq._id && (
                  <div className="px-6 pb-5 pt-0">
                    <div className="pt-4 border-t border-charcoal-900/10">
                    <p className="text-charcoal-700 leading-relaxed whitespace-pre-wrap">
                      {faq.answer}
                    </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

