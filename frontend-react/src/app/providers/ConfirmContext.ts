/**
 * Confirm dialog context — shared between ConfirmProvider and useConfirm
 */

import { createContext } from 'react'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  typedConfirmation?: { phrase: string; label: string }
}

export interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  resolve: ((confirmed: boolean) => void) | null
}

export interface ConfirmContextValue {
  state: ConfirmState
  confirm: (options: ConfirmOptions) => Promise<boolean>
  close: () => void
}

export const initialConfirmState: ConfirmState = {
  isOpen: false,
  title: '',
  message: '',
  confirmLabel: undefined,
  cancelLabel: undefined,
  variant: 'default',
  resolve: null,
}

export const ConfirmContext = createContext<ConfirmContextValue | null>(null)
