/**
 * i18n configuration for react-i18next
 *
 * Initializes i18next with the locale files copied from the Vue project.
 * Default language: es-AR (Spanish — Argentina). The visitor's choice is
 * persisted and mirrored on <html lang> so assistive technology announces
 * the page in the right language.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { languagePreferenceStorage } from '@infrastructure/storage/languagePreference.storage'
import esAR from '@i18n/locales/es-AR.json'
import enUS from '@i18n/locales/en-US.json'

export const defaultNS = 'translation' as const
export const supportedLanguages = ['es-AR', 'en-US'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

const defaultLanguage: SupportedLanguage = 'es-AR'

function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return supportedLanguages.includes(value as SupportedLanguage)
}

function syncDocumentLanguage(language: SupportedLanguage) {
  if (typeof document !== 'undefined') document.documentElement.lang = language
}

const storedLanguage = languagePreferenceStorage.read()
const initialLanguage = isSupportedLanguage(storedLanguage) ? storedLanguage : defaultLanguage

i18n.use(initReactI18next).init({
  resources: {
    'es-AR': { translation: esAR },
    'en-US': { translation: enUS },
  },
  lng: initialLanguage,
  initAsync: false,
  fallbackLng: 'es-AR',
  defaultNS,
  ns: [defaultNS],
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false,
  },
})
syncDocumentLanguage(initialLanguage)

i18n.on('languageChanged', handleLanguageChanged)

function handleLanguageChanged(language: string) {
  if (!isSupportedLanguage(language)) return
  languagePreferenceStorage.write(language)
  syncDocumentLanguage(language)
}

export default i18n

