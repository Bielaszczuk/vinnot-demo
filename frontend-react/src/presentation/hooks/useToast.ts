/**
 * useToast hook
 *
 * Provides access to the toast notification system from ToastProvider.
 */

import { useContext } from 'react'
import { ToastContext, type ToastContextValue } from '@app/providers/ToastContext'

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
