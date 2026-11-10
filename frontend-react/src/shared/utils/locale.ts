import i18next from 'i18next'

const DEFAULT_LOCALE = 'es-AR'

/** The language the visitor chose in the app, for `Intl` formatting. */
export function currentLocale(): string {
  return i18next.resolvedLanguage ?? i18next.language ?? DEFAULT_LOCALE
}
