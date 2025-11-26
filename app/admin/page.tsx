'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLogin from '@/components/admin/AdminLogin'
import AdminDashboard from '@/components/admin/AdminDashboard'
import { logger as loggerClient } from '@/lib/logger-client'

// Token validation helper
const validateToken = async (token: string): Promise<boolean> => {
  try {
    const res = await fetch('/api/admin/validate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    return res.ok
  } catch (error) {
    loggerClient.error('Token validation error:', error)
    return false
  }
}

// Check if token is expired (client-side check)
const isTokenExpired = (token: string): boolean => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    
    const payload = JSON.parse(atob(parts[1]))
    if (!payload.exp) return true
    
    const expirationTime = payload.exp * 1000 // Convert to milliseconds
    return Date.now() >= expirationTime
  } catch (error) {
    loggerClient.error('Token decode error:', error)
    return true
  }
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('admin_token')
        
        if (!token) {
          setIsAuthenticated(false)
          setLoading(false)
          return
        }

        // Client-side expiration check
        if (isTokenExpired(token)) {
          loggerClient.warn('Token expired, removing from storage')
          localStorage.removeItem('admin_token')
          setIsAuthenticated(false)
          setLoading(false)
          return
        }

        // Server-side validation
        const isValid = await validateToken(token)
        
        if (isValid) {
          setIsAuthenticated(true)
        } else {
          loggerClient.warn('Token validation failed, removing from storage')
          localStorage.removeItem('admin_token')
          setIsAuthenticated(false)
          setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.')
        }
      } catch (error) {
        loggerClient.error('Auth check error:', error)
        setError('Kimlik doğrulama hatası. Lütfen tekrar deneyin.')
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Token expiration check interval (her 5 dakikada bir)
    const interval = setInterval(() => {
      const token = localStorage.getItem('admin_token')
      if (token && isTokenExpired(token)) {
        loggerClient.warn('Token expired during session, logging out')
        localStorage.removeItem('admin_token')
        setIsAuthenticated(false)
        setError('Oturum süresi doldu. Lütfen tekrar giriş yapın.')
      }
    }, 5 * 60 * 1000) // 5 dakika

    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setIsAuthenticated(false)
    setError(null)
    router.push('/admin')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 pt-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-charcoal-900 mb-4"></div>
          <p className="text-charcoal-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-cream-50 pt-20">
        {error && (
          <div className="max-w-md mx-auto px-4 mb-4">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          </div>
        )}
        <AdminLogin 
          onLogin={() => {
            setIsAuthenticated(true)
            setError(null)
          }} 
        />
      </div>
    )
  }

  return <AdminDashboard onLogout={handleLogout} />
}



