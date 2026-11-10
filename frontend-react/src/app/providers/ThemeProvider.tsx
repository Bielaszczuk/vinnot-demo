/**
 * Theme provider
 *
 * Applies the current theme from the UI store to the document
 * and listens for system preference changes.
 */

import { type ReactNode, useEffect } from 'react'
import { useUiStore } from '@stores/ui.store'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')

    function apply() {
      const isDark =
        theme === 'dark' || (theme === 'system' && prefersDark.matches)
      root.classList.toggle('dark', isDark)
    }

    apply()

    if (theme === 'system') {
      prefersDark.addEventListener('change', apply)
      return () => prefersDark.removeEventListener('change', apply)
    }
  }, [theme])

  return <>{children}</>
}

