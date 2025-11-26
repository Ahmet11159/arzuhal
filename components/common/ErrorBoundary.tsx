'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { logger as loggerClient } from '@/lib/logger-client'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    loggerClient.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4 py-12">
          <div className="max-w-2xl w-full bg-white rounded-lg border border-charcoal-900/10 p-8 shadow-lg">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-charcoal-900 mb-2">
                Bir Hata Oluştu
              </h1>
              <p className="text-charcoal-600">
                Üzgünüz, beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya ana sayfaya dönün.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-sm font-semibold text-red-900 mb-2">
                  Hata Detayları (Sadece Geliştirme Modunda):
                </h3>
                <pre className="text-xs text-red-800 overflow-auto max-h-64">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {'\n\n'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition"
              >
                <RefreshCw size={18} />
                Tekrar Dene
              </button>
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-cream-100 text-charcoal-900 rounded-lg hover:bg-cream-200 premium-transition border border-charcoal-900/10"
              >
                <Home size={18} />
                Ana Sayfaya Dön
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}


