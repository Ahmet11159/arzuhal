'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { LogOut } from 'lucide-react'

// Lazy load büyük component'ler - sadece aktif tab'de yüklenecek
const ProductManagement = dynamic(() => import('./ProductManagement'), {
  loading: () => <div className="text-center py-12 text-charcoal-600">Yükleniyor...</div>,
})
const StoryManagement = dynamic(() => import('./StoryManagement'), {
  loading: () => <div className="text-center py-12 text-charcoal-600">Yükleniyor...</div>,
})
const CategoryManagement = dynamic(() => import('./CategoryManagement'), {
  loading: () => <div className="text-center py-12 text-charcoal-600">Yükleniyor...</div>,
})
const SiteImageManagement = dynamic(() => import('./SiteImageManagement'), {
  loading: () => <div className="text-center py-12 text-charcoal-600">Yükleniyor...</div>,
})
const BusinessInfoManagement = dynamic(() => import('./BusinessInfoManagement'), {
  loading: () => <div className="text-center py-12 text-charcoal-600">Yükleniyor...</div>,
})
const FAQManagement = dynamic(() => import('./FAQManagement'), {
  loading: () => <div className="text-center py-12 text-charcoal-600">Yükleniyor...</div>,
})
const TestimonialManagement = dynamic(() => import('./TestimonialManagement'), {
  loading: () => <div className="text-center py-12 text-charcoal-600">Yükleniyor...</div>,
})
const AnnouncementManagement = dynamic(() => import('./AnnouncementManagement'), {
  loading: () => <div className="text-center py-12 text-charcoal-600">Yükleniyor...</div>,
})
const ContactMessageManagement = dynamic(() => import('./ContactMessageManagement'), {
  loading: () => <div className="text-center py-12 text-charcoal-600">Yükleniyor...</div>,
})

type Tab = 'products' | 'stories' | 'categories' | 'site-images' | 'business-info' | 'faqs' | 'testimonials' | 'announcements' | 'contact-messages'

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('products')
  
  // Error boundary için error state
  const [error, setError] = useState<string | null>(null)
  
  // Error handling
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Admin Dashboard Error:', event.error)
      setError('Bir hata oluştu. Lütfen sayfayı yenileyin.')
    }
    
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  const handleLogout = () => {
    // Clear token and any related data
    localStorage.removeItem('admin_token')
    // Redirect to login page
    onLogout()
    // Optional: Clear any cached data
    if (typeof window !== 'undefined') {
      window.location.href = '/admin'
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 premium-transition"
          >
            Sayfayı Yenile
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-charcoal-900">
            Admin Paneli
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation"
            aria-label="Admin panelinden çıkış yap"
          >
            <LogOut size={18} aria-hidden="true" />
            Çıkış Yap
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-4 mb-8 border-b border-charcoal-900/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 sm:px-6 py-3 font-medium premium-transition focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-b-2 border-charcoal-900 text-charcoal-900'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
            aria-label="Ürünler sekmesi"
            aria-current={activeTab === 'products' ? 'page' : undefined}
          >
            Ürünler
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`px-4 sm:px-6 py-3 font-medium premium-transition focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation whitespace-nowrap ${
              activeTab === 'stories'
                ? 'border-b-2 border-charcoal-900 text-charcoal-900'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
            aria-label="Hikayeler sekmesi"
            aria-current={activeTab === 'stories' ? 'page' : undefined}
          >
            Hikayeler
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 sm:px-6 py-3 font-medium premium-transition focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation whitespace-nowrap ${
              activeTab === 'categories'
                ? 'border-b-2 border-charcoal-900 text-charcoal-900'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
            aria-label="Kategoriler sekmesi"
            aria-current={activeTab === 'categories' ? 'page' : undefined}
          >
            Kategoriler
          </button>
          <button
            onClick={() => setActiveTab('site-images')}
            className={`px-4 sm:px-6 py-3 font-medium premium-transition focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation whitespace-nowrap ${
              activeTab === 'site-images'
                ? 'border-b-2 border-charcoal-900 text-charcoal-900'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
            aria-label="Site Görselleri sekmesi"
            aria-current={activeTab === 'site-images' ? 'page' : undefined}
          >
            Site Görselleri
          </button>
          <button
            onClick={() => setActiveTab('business-info')}
            className={`px-4 sm:px-6 py-3 font-medium premium-transition focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation whitespace-nowrap ${
              activeTab === 'business-info'
                ? 'border-b-2 border-charcoal-900 text-charcoal-900'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
            aria-label="İşletme Bilgileri sekmesi"
            aria-current={activeTab === 'business-info' ? 'page' : undefined}
          >
            İşletme Bilgileri
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`px-4 sm:px-6 py-3 font-medium premium-transition focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation whitespace-nowrap ${
              activeTab === 'faqs'
                ? 'border-b-2 border-charcoal-900 text-charcoal-900'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
            aria-label="SSS sekmesi"
            aria-current={activeTab === 'faqs' ? 'page' : undefined}
          >
            SSS
          </button>
          <button
            onClick={() => setActiveTab('testimonials')}
            className={`px-4 sm:px-6 py-3 font-medium premium-transition focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation whitespace-nowrap ${
              activeTab === 'testimonials'
                ? 'border-b-2 border-charcoal-900 text-charcoal-900'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
            aria-label="Referanslar sekmesi"
            aria-current={activeTab === 'testimonials' ? 'page' : undefined}
          >
            Referanslar
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-4 sm:px-6 py-3 font-medium premium-transition focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation whitespace-nowrap ${
              activeTab === 'announcements'
                ? 'border-b-2 border-charcoal-900 text-charcoal-900'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
            aria-label="Duyurular sekmesi"
            aria-current={activeTab === 'announcements' ? 'page' : undefined}
          >
            Duyurular
          </button>
          <button
            onClick={() => setActiveTab('contact-messages')}
            className={`px-4 sm:px-6 py-3 font-medium premium-transition focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation whitespace-nowrap ${
              activeTab === 'contact-messages'
                ? 'border-b-2 border-charcoal-900 text-charcoal-900'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
            aria-label="İletişim Mesajları sekmesi"
            aria-current={activeTab === 'contact-messages' ? 'page' : undefined}
          >
            İletişim Mesajları
          </button>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'products' && <ProductManagement />}
          {activeTab === 'stories' && <StoryManagement />}
          {activeTab === 'categories' && <CategoryManagement />}
          {activeTab === 'site-images' && <SiteImageManagement />}
          {activeTab === 'business-info' && <BusinessInfoManagement />}
          {activeTab === 'faqs' && <FAQManagement />}
          {activeTab === 'testimonials' && <TestimonialManagement />}
          {activeTab === 'announcements' && <AnnouncementManagement />}
          {activeTab === 'contact-messages' && <ContactMessageManagement />}
        </div>
      </div>
    </div>
  )
}


