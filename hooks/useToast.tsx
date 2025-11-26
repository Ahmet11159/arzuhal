'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Toast, ToastType } from '@/components/common/Toast'
import ToastContainer from '@/components/common/Toast'

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => string
  success: (message: string, duration?: number) => string
  error: (message: string, duration?: number) => string
  info: (message: string, duration?: number) => string
  warning: (message: string, duration?: number) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: Toast = {
        id,
        message,
        type,
        duration,
      }

      console.log('📢 Toast eklendi:', { id, message, type, duration })
      setToasts((prev) => {
        const updated = [...prev, newToast]
        console.log('📋 Toplam toast sayısı:', updated.length)
        return updated
      })
      return id
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const success = useCallback(
    (message: string, duration?: number) => {
      console.log('🎉 Success toast çağrıldı:', message)
      return showToast(message, 'success', duration)
    },
    [showToast]
  )

  const error = useCallback(
    (message: string, duration?: number) => showToast(message, 'error', duration),
    [showToast]
  )

  const info = useCallback(
    (message: string, duration?: number) => showToast(message, 'info', duration),
    [showToast]
  )

  const warning = useCallback(
    (message: string, duration?: number) => showToast(message, 'warning', duration),
    [showToast]
  )

  return (
    <>
      <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
        {children}
      </ToastContext.Provider>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

