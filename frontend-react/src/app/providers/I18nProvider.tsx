/**
 * I18n provider
 *
 * Ensures react-i18next is initialized before rendering children.
 * Imports the i18n instance so side effects run early.
 */

import { type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@i18n/index'

interface I18nProviderProps {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  )
}

