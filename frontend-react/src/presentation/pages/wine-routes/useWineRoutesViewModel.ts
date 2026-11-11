import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useWineRoutes } from '@hooks/queries/wineRoute/useWineRoutes'
import { useCountries } from '@hooks/queries/wine/useCountries'
import { useRegions } from '@hooks/queries/wine/useRegions'
import { useDebounce } from '@hooks/useDebounce'
import { useUrlFilters } from '@hooks/useUrlFilters'
import { useReducedMotion } from '@hooks/useReducedMotion'
import { useCountryName } from '@hooks/useCountryName'
import type { RouteDifficulty, WineRoute, WineRouteFilter } from '@domain/route/route.types'

const DIFFICULTIES: readonly RouteDifficulty[] = ['short', 'medium', 'long']
const FILTER_KEYS = ['search', 'difficulty', 'country', 'region'] as const

function parseDifficulty(value: string): RouteDifficulty | null {
  return DIFFICULTIES.includes(value as RouteDifficulty) ? (value as RouteDifficulty) : null
}

/** Search, filters and page live in the URL and are applied by the API, so count and pages match the list. */
export function useWineRoutesViewModel() {
  const { t } = useTranslation()
  const { values, page: currentPage, update } = useUrlFilters(FILTER_KEYS)
  const reducedMotion = useReducedMotion()
  const countryName = useCountryName()
  const search = values.search
  const selectedDifficulty = parseDifficulty(values.difficulty)
  const selectedCountry = values.country || null
  const selectedRegion = values.region || null

  const debouncedSearch = useDebounce(search, 350)
  const filter = useMemo<WineRouteFilter | undefined>(() => {
    const active: WineRouteFilter = {
      search: debouncedSearch.trim() || undefined,
      difficulty: selectedDifficulty ?? undefined,
      country: selectedCountry ?? undefined,
      region: selectedRegion ?? undefined,
    }
    return Object.values(active).some(Boolean) ? active : undefined
  }, [debouncedSearch, selectedCountry, selectedDifficulty, selectedRegion])
  const { data, isLoading, isError, error, refetch } = useWineRoutes(filter, currentPage, 20)
  const { data: countries = [] } = useCountries()
  const { data: regions = [] } = useRegions()

  const routes = useMemo<WineRoute[]>(() => data?.routes ?? [], [data?.routes])

  const pagination = data?.pagination
  const totalItems = pagination?.totalItems ?? 0
  const totalPages = pagination?.totalPages ?? 1
  const isFirstPage = currentPage === 0
  const isLastPage = currentPage >= totalPages - 1

  // The value stays the stored name the API filters by; only the label follows the interface language.
  const countryOptions = useMemo(() => {
    return countries.map((country) => ({ value: country.name, label: countryName(country.name) }))
  }, [countries, countryName])

  const regionOptions = useMemo(() => {
    if (!selectedCountry) return []
    const selectedCountryEntity = countries.find(
      (country) => country.name === selectedCountry || country.id === selectedCountry,
    )
    if (!selectedCountryEntity) return []
    return regions
      .filter((region) => region.countryId === selectedCountryEntity.id)
      .map((region) => ({ value: region.name, label: region.name }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [countries, regions, selectedCountry])

  const hasActiveFilters = !!(search || selectedDifficulty || selectedCountry || selectedRegion)

  const clearFilters = useCallback(() => {
    update({ search: null, difficulty: null, country: null, region: null })
  }, [update])

  const handleSearchChange = useCallback((value: string) => {
    update({ search: value })
  }, [update])

  const handleDifficultyChange = useCallback((value: string) => {
    update({ difficulty: parseDifficulty(value) })
  }, [update])

  const handleCountryChange = useCallback((value: string) => {
    update({ country: value, region: null })
  }, [update])

  const handleRegionChange = useCallback((value: string) => {
    update({ region: value })
  }, [update])

  const goToPage = useCallback((page: number) => {
    update({ page })
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [update, reducedMotion])

  return {
    t,
    search,
    selectedDifficulty,
    selectedCountry,
    selectedRegion,
    currentPage,
    routes,
    isLoading,
    isError,
    error,
    retry: refetch,
    totalItems,
    totalPages,
    isFirstPage,
    isLastPage,
    countryOptions,
    regionOptions,
    hasActiveFilters,
    clearFilters,
    handleSearchChange,
    handleDifficultyChange,
    handleCountryChange,
    handleRegionChange,
    goToPage,
  }
}
