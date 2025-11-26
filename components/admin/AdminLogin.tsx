'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logger as loggerClient } from '@/lib/logger-client'

export default function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Client-side validation
    if (!email.trim() || !password.trim()) {
      setError('Lütfen e-posta ve şifre alanlarını doldurun.')
      setLoading(false)
      return
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Lütfen geçerli bir e-posta adresi girin.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await res.json()

      if (res.ok && data.token) {
        localStorage.setItem('admin_token', data.token)
        loggerClient.log('Admin login successful')
        onLogin()
        router.push('/admin')
      } else {
        const errorMessage = data.error || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.'
        setError(errorMessage)
        loggerClient.warn('Admin login failed:', errorMessage)
      }
    } catch (error: any) {
      loggerClient.error('Login error:', error)
      setError('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 border border-charcoal-900/10">
        <h1 className="text-3xl font-serif font-bold text-charcoal-900 mb-2 text-center">
          Admin Girişi
        </h1>
        <p className="text-charcoal-600 text-center mb-8">ARZUHAL Yönetim Paneli</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-charcoal-900 mb-2">
              E-posta
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 premium-transition min-h-[44px] touch-manipulation"
              placeholder="ornek@email.com"
              aria-label="E-posta adresi"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-charcoal-900 mb-2">
              Şifre
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 premium-transition min-h-[44px] touch-manipulation"
              placeholder="••••••••"
              aria-label="Şifre"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full px-4 py-3 bg-charcoal-900 text-cream-50 font-medium rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 min-h-[44px] touch-manipulation"
            aria-label="Admin girişi yap"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-cream-50"></span>
                Giriş yapılıyor...
              </span>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

