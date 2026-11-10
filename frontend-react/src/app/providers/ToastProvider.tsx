/**
 * Toast provider
 *
 * Manages toast notification state via React Context.
 * Does NOT use Zustand — toasts are ephemeral UI state.
 */

import {
  useCallback,
  useState,
  type ReactNode,
} from 'react'
import { ToastContext, type Toast } from './ToastContext'

let toastCounter = 0

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `toast-${++toastCounter}`
      setToasts((prev) => [...prev, { ...toast, id }])
    },
    [],
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}
