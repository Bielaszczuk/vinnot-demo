/** Browser persistence for the interface language; blocked storage degrades to the default language. */
const key = 'vinnot.language.v1'

export const languagePreferenceStorage = {
  read(): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  write(language: string): void {
    try {
      localStorage.setItem(key, language)
    } catch {
      /* The choice still applies for this page view. */
    }
  },
}
