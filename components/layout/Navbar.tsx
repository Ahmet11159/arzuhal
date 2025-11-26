'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X, Bell, Search, X as XIcon } from 'lucide-react'
import { logger as loggerClient } from '@/lib/logger-client'
// import { motion, AnimatePresence } from 'framer-motion' // Geçici olarak devre dışı

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pendingMessagesCount, setPendingMessagesCount] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    // Admin token kontrolü
    const checkAdmin = () => {
      const token = localStorage.getItem('admin_token')
      if (token) {
        try {
          // Token'ı decode et (basit kontrol - JWT formatı: header.payload.signature)
          const parts = token.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]))
            if (payload.role === 'admin') {
              setIsAdmin(true)
              return
            }
          }
        } catch (error) {
          // Token geçersizse admin değil
          loggerClient.warn('Token decode error:', error)
        }
      }
      setIsAdmin(false)
    }
    
    checkAdmin()
    
    // Storage değişikliklerini dinle (farklı tab'larda giriş/çıkış için)
    const handleStorageChange = () => {
      checkAdmin()
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Yeni mesaj sayısını kontrol et (sadece admin için)
  useEffect(() => {
    if (!isAdmin) return

    const fetchPendingCount = async () => {
      try {
        const token = localStorage.getItem('admin_token')
        if (!token) return

        const res = await fetch('/api/contact-messages?status=pending&limit=1000', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        })
        const data = await res.json()
        
        if (data.success) {
          const messages = data.data?.messages || data.data || []
          setPendingMessagesCount(Array.isArray(messages) ? messages.length : 0)
        }
      } catch (error) {
        loggerClient.error('Error fetching pending messages:', error)
      }
    }

    fetchPendingCount()
    
    // Her 30 saniyede bir kontrol et
    const interval = setInterval(fetchPendingCount, 30000)
    
    return () => clearInterval(interval)
  }, [isAdmin])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery.trim())}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        
        if (data.success && data.data) {
          setSearchResults(Array.isArray(data.data) ? data.data.slice(0, 5) : [])
        } else {
          setSearchResults([])
        }
      } catch (error) {
        loggerClient.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Search input focus
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/urunler?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowSearch(false)
      setSearchQuery('')
      setSearchResults([])
    }
  }

  const handleProductClick = (productId: string) => {
    router.push(`/urunler/${productId}`)
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const navLinks = [
    { href: '/urunler', label: 'Ürünler' },
    { href: '/konseptler', label: 'Konseptler' },
    { href: '/hakkimizda', label: 'Hakkımızda' },
    { href: '/sss', label: 'SSS' },
    { href: '/iletisim', label: 'İletişim' },
    { href: '/hesabim', label: 'Hesabım' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', badge: pendingMessagesCount > 0 ? pendingMessagesCount : undefined }] : []),
  ]

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 glass-medium shadow-depth-md"
      style={{ marginTop: 'var(--announcement-height, 0px)' }}
      role="navigation"
      aria-label="Ana navigasyon menüsü"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-18 md:h-20">
          <div>
            <Link 
              href="/" 
              className="flex items-center space-x-2 group focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 rounded-lg p-1 touch-manipulation"
              aria-label="Ana sayfaya git"
            >
              <span className="text-2xl sm:text-3xl md:text-3xl font-serif font-bold gradient-text premium-transition">
                ARZUHAL
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {/* Arama Butonu */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="px-3 py-2 text-charcoal-900 hover:text-gold-500 premium-transition font-medium rounded-lg group flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation"
              aria-label="Arama"
            >
              <Search size={18} aria-hidden="true" />
            </button>
            
            {navLinks.map((link) => (
              <div key={link.href} className="relative">
                <Link
                  href={link.href}
                  className="relative px-3 lg:px-4 py-2 text-charcoal-900 hover:text-gold-500 premium-transition font-medium rounded-lg group flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation"
                  aria-label={`${link.label} sayfasına git`}
                >
                  <span className="relative z-10 text-sm lg:text-base">{link.label}</span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="relative z-10 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center" aria-label={`${link.badge} yeni mesaj`}>
                      {link.badge > 99 ? '99+' : link.badge}
                    </span>
                  )}
                  <span className="absolute inset-0 bg-gold-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </Link>
              </div>
            ))}
          </div>

          {/* Mobile Menu Buttons */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Arama Butonu */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="text-charcoal-900 p-2.5 rounded-lg hover:bg-charcoal-900/5 active:bg-charcoal-900/10 active:scale-95 premium-transition focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Arama"
              type="button"
            >
              <Search size={20} aria-hidden="true" />
            </button>
            
            <button
              className="text-charcoal-900 p-2.5 rounded-lg hover:bg-charcoal-900/5 active:bg-charcoal-900/10 active:scale-95 premium-transition focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation -mr-1"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              type="button"
            >
            <span className="relative w-6 h-6 flex items-center justify-center">
              <span
                className={`absolute w-5 h-0.5 bg-charcoal-900 rounded-full transition-all duration-300 ${
                  isOpen ? 'rotate-45 translate-y-0' : '-translate-y-1.5'
                }`}
                aria-hidden="true"
              />
              <span
                className={`absolute w-5 h-0.5 bg-charcoal-900 rounded-full transition-all duration-300 ${
                  isOpen ? 'opacity-0' : 'opacity-100'
                }`}
                aria-hidden="true"
              />
              <span
                className={`absolute w-5 h-0.5 bg-charcoal-900 rounded-full transition-all duration-300 ${
                  isOpen ? '-rotate-45 translate-y-0' : 'translate-y-1.5'
                }`}
                aria-hidden="true"
              />
            </span>
          </button>
        </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div
            id="mobile-menu"
            className="md:hidden pb-4 space-y-1 border-t border-charcoal-900/10 mt-2 pt-2 animate-in slide-in-from-top-2 duration-200"
            role="menu"
            aria-label="Mobil menü"
          >
            {navLinks.map((link, index) => (
              <div 
                key={link.href} 
                className="relative"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Link
                  href={link.href}
                  className="block px-4 py-3.5 text-charcoal-900 hover:text-gold-500 hover:bg-charcoal-900/5 active:bg-charcoal-900/10 active:scale-[0.98] premium-transition font-medium rounded-lg flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[48px] touch-manipulation"
                  onClick={() => setIsOpen(false)}
                  role="menuitem"
                  aria-label={`${link.label} sayfasına git`}
                >
                  <span className="text-base font-medium">{link.label}</span>
                  {link.badge && link.badge > 0 && (
                    <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[24px] text-center" aria-label={`${link.badge} yeni mesaj`}>
                      {link.badge > 99 ? '99+' : link.badge}
                    </span>
                  )}
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Arama Çubuğu - Desktop ve Mobile */}
        {showSearch && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-charcoal-900/10 shadow-depth-lg z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" size={20} aria-hidden="true" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ürün ara..."
                    className="w-full pl-10 pr-10 py-3 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent text-base"
                    aria-label="Ürün ara"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setSearchResults([])
                        searchInputRef.current?.focus()
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-900 premium-transition p-1"
                      aria-label="Aramayı temizle"
                    >
                      <XIcon size={18} aria-hidden="true" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Sonuçları */}
                {searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-charcoal-900/10 rounded-lg shadow-depth-lg max-h-96 overflow-y-auto z-50">
                    {isSearching ? (
                      <div className="p-4 text-center text-charcoal-600">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gold-500"></div>
                        <p className="mt-2 text-sm">Aranıyor...</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="py-2">
                        {searchResults.map((product) => (
                          <button
                            key={product._id}
                            onClick={() => handleProductClick(product._id)}
                            className="w-full px-4 py-3 text-left hover:bg-cream-100 premium-transition flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-inset"
                            aria-label={`${product.name} ürününü görüntüle`}
                          >
                            {product.images && product.images[0] && (
                              <div className="relative w-12 h-12 bg-cream-200 rounded overflow-hidden flex-shrink-0">
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-charcoal-900 truncate">{product.name}</p>
                              <p className="text-sm text-charcoal-600 truncate">{product.description}</p>
                            </div>
                          </button>
                        ))}
                        <div className="border-t border-charcoal-900/10 mt-2 pt-2">
                          <button
                            type="submit"
                            className="w-full px-4 py-2 text-sm text-gold-600 hover:bg-gold-50 premium-transition text-center font-medium"
                          >
                            Tüm sonuçları gör ({searchQuery})
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-charcoal-600">
                        <p className="text-sm">Sonuç bulunamadı</p>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

