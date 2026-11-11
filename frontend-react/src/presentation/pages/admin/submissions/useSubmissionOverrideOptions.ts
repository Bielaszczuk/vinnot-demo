import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCountryName } from '@hooks/useCountryName'
import type { SelectOption } from '@components/ui/Select'
import { useCountries } from '@hooks/queries/wine/useCountries'
import { useGrapeTypes } from '@hooks/queries/wine/useGrapeTypes'
import { useRegions } from '@hooks/queries/wine/useRegions'
import { useWineTypes } from '@hooks/queries/wine/useWineTypes'
import { wineTypeLabel } from '@shared/i18n/wineTypeLabel'

/**
 * Catalog choices for the typed corrections: wine types by API code, countries
 * and the regions of the chosen country by name (the backend takes names).
 */
export function useSubmissionOverrideOptions(country: string | null) {
  const { t, i18n } = useTranslation()
  const countryName = useCountryName()
  const english = i18n?.language?.startsWith('en') === true
  const { data: wineTypes = [] } = useWineTypes()
  const { data: countries = [] } = useCountries()
  const { data: regions = [] } = useRegions()
  const { data: grapeTypes = [], isLoading: grapesLoading } = useGrapeTypes()

  return useMemo(() => ({
    wineTypes: wineTypes.map<SelectOption>((type) => ({
      value: type.code,
      label: wineTypeLabel(t, type.value, english ? type.names.en : type.names.es),
    })),
    countries: countries.map<SelectOption>((item) => ({ value: item.name, label: countryName(item.name) })),
    regions: regions
      .filter((region) => region.countryName === country)
      .map<SelectOption>((region) => ({ value: region.name, label: region.name })),
    grapes: grapeTypes.map((grape) => grape.name),
    grapesLoading,
  }), [countries, country, countryName, english, grapeTypes, grapesLoading, regions, t, wineTypes])
}
