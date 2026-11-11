import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { localizeCountryName } from '@domain/location/countryNames'

/**
 * Formats a stored (Spanish) country name in the interface language. Use it only for
 * displayed text: filters, form values and ids sent to the API keep the stored name.
 */
export function useCountryName(): (storedName: string | null | undefined) => string {
  const { i18n } = useTranslation()
  const language = i18n?.language
  return useCallback((storedName: string | null | undefined) => localizeCountryName(storedName, language), [language])
}
