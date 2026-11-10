/**
 * Root application providers composition
 *
 * Composes all providers in the correct nesting order.
 * Order matters: outer providers are available to inner ones.
 */

import { type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryProvider } from './QueryProvider'
import { I18nProvider } from './I18nProvider'
import { ThemeProvider } from './ThemeProvider'
import { ToastProvider } from './ToastProvider'
import { ConfirmProvider } from './ConfirmProvider'
import { AuthProvider } from './AuthProvider'
import { StoreProvider } from './StoreProvider'
import { AccountLocaleSync } from './AccountLocaleSync'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <StoreProvider>
        <QueryProvider>
          <I18nProvider>
            <ThemeProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <AuthProvider>
                    <AccountLocaleSync />
                    {children}
                  </AuthProvider>
                </ConfirmProvider>
              </ToastProvider>
            </ThemeProvider>
          </I18nProvider>
        </QueryProvider>
      </StoreProvider>
    </BrowserRouter>
  )
}
