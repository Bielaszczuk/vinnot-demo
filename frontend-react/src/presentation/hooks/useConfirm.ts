/**
 * useConfirm hook
 *
 * Provides access to the confirm dialog from ConfirmProvider.
 */

import { useContext } from 'react'
import { ConfirmContext, type ConfirmContextValue } from '@app/providers/ConfirmContext'

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return ctx
}
