/**
 * useModal hook
 *
 * Simple open/close state manager for modals and dialogs.
 */

import { useCallback, useState } from 'react'

export interface UseModalReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export function useModal(initialOpen: boolean = false): UseModalReturn {
  const [isOpen, setIsOpen] = useState(initialOpen)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return { isOpen, open, close, toggle }
}

