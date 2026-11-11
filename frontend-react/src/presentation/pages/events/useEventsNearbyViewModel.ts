import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useGeolocation } from '@hooks/useGeolocation'
import { useDebounce } from '@hooks/useDebounce'
import { useUrlFilters } from '@hooks/useUrlFilters'
import { useReducedMotion } from '@hooks/useReducedMotion'
import { useCountryName } from '@hooks/useCountryName'
import { useDiscoverEvents } from '@hooks/queries/event/useDiscoverEvents'
import { useEvents } from '@hooks/queries/event/useEvents'
import { useCountries } from '@hooks/queries/wine/useCountries'
import { useRegions } from '@hooks/queries/wine/useRegions'
import type { Event, EventType } from '@domain/event/event.types'

const FILTER_KEYS = ['search', 'type', 'country', 'region'] as const

export function useEventsNearbyViewModel() {
  const { t } = useTranslation()
  const geo = useGeolocation()

  // Search, filters and page live in the URL so they survive Back.
  const { values, page: currentPage, update } = useUrlFilters(FILTER_KEYS)
  const reducedMotion = useReducedMotion()
  const countryName = useCountryName()
  const search = values.search
  const selectedType = values.type as EventType | ''
  const selectedCountry = values.country
  const selectedRegion = values.region
  const debouncedSearch = useDebounce(search, 350)
  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || selectedType || selectedCountry || selectedRegion,
  )
  const eventFilter = useMemo(
    () =>
      hasActiveFilters
        ? {
            search: debouncedSearch.trim() || undefined,
            type: selectedType || undefined,
            country: selectedCountry || undefined,
            region: selectedRegion || undefined,
          }
        : undefined,
    [
      debouncedSearch,
      hasActiveFilters,
      selectedCountry,
      selectedRegion,
      selectedType,
    ],
  )

  const hasGeo = geo.latitude !== null && geo.longitude !== null
  const useGlobalSearch = hasActiveFilters || (!geo.loading && !hasGeo)

  const discoveryQuery = useDiscoverEvents(
    geo.latitude,
    geo.longitude,
    100,
    currentPage,
    50,
    !hasActiveFilters && !geo.loading,
  )
  const allQuery = useEvents(eventFilter, currentPage, 50, useGlobalSearch)
  const { data: countries = [] } = useCountries()
  const { data: regions = [] } = useRegions()

  const discovery = discoveryQuery.data
  const pagination = useGlobalSearch
    ? allQuery.data?.pagination
    : discovery?.pagination
  const isLoading = !hasActiveFilters && geo.loading || (useGlobalSearch ? allQuery.isLoading : discoveryQuery.isLoading)
  const isError = useGlobalSearch ? allQuery.isError : discoveryQuery.isError

  const filteredEvents = useMemo<Event[]>(() => {
    if (useGlobalSearch) {
      return allQuery.data?.events ?? []
    }

    const discoveredEvents = discovery?.nearbyEventsFound
      ? discovery.nearbyEvents
      : discovery?.otherEvents
    return discoveredEvents ?? []
  }, [allQuery.data?.events, discovery, useGlobalSearch])

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

  const totalEvents = pagination?.totalItems ?? filteredEvents.length
  const totalPages = pagination?.totalPages ?? 1
  const isFirstPage = currentPage === 0
  const isLastPage = currentPage >= totalPages - 1

  const changeSearch = useCallback((value: string) => {
    update({ search: value })
  }, [update])

  const changeType = useCallback((value: EventType | '') => {
    update({ type: value })
  }, [update])

  const changeCountry = useCallback((value: string) => {
    update({ country: value, region: null })
  }, [update])

  const changeRegion = useCallback((value: string) => {
    update({ region: value })
  }, [update])

  const clearFilters = useCallback(() => {
    update({ search: null, type: null, country: null, region: null })
  }, [update])

  const goToPage = useCallback((page: number) => {
    update({ page })
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [update, reducedMotion])

  return {
    t,
    discoveryMode: hasActiveFilters ? 'filtered' : geo.loading ? 'locating' : !hasGeo ? 'global' : discovery?.nearbyEventsFound === false ? 'other' : 'nearby',
    geo,
    search,
    setSearch: changeSearch,
    selectedType,
    setSelectedType: changeType,
    selectedCountry,
    setSelectedCountry: changeCountry,
    selectedRegion,
    setSelectedRegion: changeRegion,
    currentPage,
    isLoading,
    isError,
    error: useGlobalSearch ? allQuery.error : discoveryQuery.error,
    retry: useGlobalSearch ? allQuery.refetch : discoveryQuery.refetch,
    filteredEvents,
    nearbyEventsFound:
      useGlobalSearch || (discovery?.nearbyEventsFound ?? true),
    showDiscoveryFallback:
      !useGlobalSearch && discovery?.nearbyEventsFound === false && filteredEvents.length > 0,
    countryOptions,
    regionOptions,
    totalEvents,
    totalPages,
    isFirstPage,
    isLastPage,
    hasActiveFilters,
    clearFilters,
    goToPage,
  }
}
