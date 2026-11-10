/**
 * Confirm dialog provider
 *
 * Manages confirm dialog state via React Context.
 * Does NOT use Zustand — confirm dialogs are ephemeral UI state.
 */

import {
  useCallback,
  useState,
  type ReactNode,
} from 'react'
import {
  ConfirmContext,
  initialConfirmState,
  type ConfirmOptions,
  type ConfirmState,
} from './ConfirmContext'

interface ConfirmProviderProps {
  children: ReactNode
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [state, setState] = useState<ConfirmState>(initialConfirmState)

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        setState({
          ...options,
          isOpen: true,
          resolve,
        })
      }),
    [],
  )

  const close = useCallback(() => {
    state.resolve?.(false)
    setState(initialConfirmState)
  }, [state])

  return (
    <ConfirmContext.Provider value={{ state, confirm, close }}>
      {children}
    </ConfirmContext.Provider>
  )
}
