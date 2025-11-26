'use client'

import { ToastProvider } from '@/hooks/useToast'
import ErrorBoundary from '@/components/common/ErrorBoundary'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ErrorBoundary>
  )
}

