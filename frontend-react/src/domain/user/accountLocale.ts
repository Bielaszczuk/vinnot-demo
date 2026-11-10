/** Language stored on the account; notifications are rendered in it. */
export type PreferredLanguage = 'es' | 'en'

/** Maps an interface locale such as "en-US" to the account language the backend stores. */
export function toPreferredLanguage(uiLanguage: string | null | undefined): PreferredLanguage {
  return uiLanguage?.trim().toLowerCase().startsWith('en') ? 'en' : 'es'
}
