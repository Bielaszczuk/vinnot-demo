import { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWineSearch } from '@hooks/queries/wine/useWineSearch'
import { useGrapeTypes } from '@hooks/queries/wine/useGrapeTypes'
import { useCountries } from '@hooks/queries/wine/useCountries'
import { useRegions } from '@hooks/queries/wine/useRegions'
import { useLocationCountry } from '@hooks/useLocationCountry'
import { useCountryName } from '@hooks/useCountryName'
import { useReducedMotion } from '@hooks/useReducedMotion'
import { useWineTypes } from '@hooks/queries/wine/useWineTypes'
import { wineTypeLabel } from '@shared/i18n/wineTypeLabel'
import type { WineFilter, WineType } from '@domain/wine/wine.types'

const PAGE_SIZE = 20

export function useWineSearchViewModel() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const reducedMotion = useReducedMotion()
  const countryName = useCountryName()

  const initialSearch = searchParams.get('q') ?? searchParams.get('search') ?? ''
  const initialType = (searchParams.get('type') ?? '') as WineType | ''
  const initialGrape = searchParams.get('grape') ?? ''
  const initialPage = Number(searchParams.get('page') ?? '0')

  const [search, setSearch] = useState(initialSearch)
  const [selectedType, setSelectedType] = useState<WineType | ''>(initialType)
  const [selectedGrape, setSelectedGrape] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') ?? '')
  const [ignoreLocationCountry, setIgnoreLocationCountry] = useState(searchParams.has('country'))
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get('region') ?? '')
  const [page, setPage] = useState(searchParams.has('country') ? initialPage : 0)
  const { data: grapeTypes = [] } = useGrapeTypes()
  const { data: wineTypes = [] } = useWineTypes()
  const { data: countries = [], isPending: countriesPending } = useCountries()
  const { data: regions = [] } = useRegions()
  const automaticCountryEnabled = !ignoreLocationCountry && !searchParams.has('country')
  const locationCountry = useLocationCountry(countries, automaticCountryEnabled)
  const effectiveCountry = searchParams.has('country') ? searchParams.get('country') ?? '' : selectedCountry || locationCountry.country
  const resolvingCountry = automaticCountryEnabled && (countriesPending || locationCountry.loading)

  const normalizedInitialGrape = useMemo(() => {
    if (!initialGrape || grapeTypes.length === 0) return ''
    const match = grapeTypes.find(
      (grape) =>
        grape.name === initialGrape
        || grape.name.toLowerCase() === initialGrape.toLowerCase(),
    )
    return match?.name ?? ''
  }, [grapeTypes, initialGrape])

  const effectiveSelectedGrape = selectedGrape || normalizedInitialGrape
  const effectiveSearch = useMemo(() => {
    if (search) return search
    if (!initialGrape) return ''
    return effectiveSelectedGrape ? '' : initialGrape
  }, [effectiveSelectedGrape, initialGrape, search])

  const filters = useMemo<Omit<WineFilter, 'search'>>(
    () => ({
      type: selectedType || undefined,
      grapeVariety: effectiveSelectedGrape || undefined,
      country: effectiveCountry || undefined,
      region: selectedRegion || undefined,
    }),
    [selectedType, effectiveSelectedGrape, effectiveCountry, selectedRegion],
  )

  const { data, isLoading, isError, error, refetch } = useWineSearch(effectiveSearch, filters, page, PAGE_SIZE, !resolvingCountry)

  // The value stays the stored name the API filters by; only the label follows the interface language.
  const countryOptions = useMemo(() => {
    return countries.map((country) => ({ value: country.name, label: countryName(country.name) }))
  }, [countries, countryName])

  const regionOptions = useMemo(() => {
    if (!effectiveCountry) return []
    const selectedCountryEntity = countries.find(
      (country) => country.name === effectiveCountry || country.id === effectiveCountry,
    )
    if (!selectedCountryEntity) return []
    return regions
      .filter((region) => region.countryId === selectedCountryEntity.id)
      .map((region) => region.name)
      .sort()
  }, [countries, regions, effectiveCountry])

  const wines = data?.wines ?? []
  const pagination = data?.pagination
  const totalWines = pagination?.totalItems ?? wines.length
  const totalPages = pagination?.totalPages ?? 1
  const hasActiveFilters = !!(
    effectiveSearch
    || selectedType
    || effectiveSelectedGrape
    || effectiveCountry
    || selectedRegion
  )

  const updateUrl = useCallback(
    (q: string, p: number) => {
      const params = new URLSearchParams()
      if (effectiveCountry || ignoreLocationCountry) params.set('country', effectiveCountry)
      if (selectedRegion) params.set('region', selectedRegion)
      if (q) params.set('q', q)
      if (p > 0) params.set('page', String(p))
      setSearchParams(params, { replace: true })
    },
    [setSearchParams, effectiveCountry, selectedRegion, ignoreLocationCountry],
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage)
      updateUrl(search, newPage)
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
    },
    [search, updateUrl, reducedMotion],
  )

  const clearFilters = useCallback(() => {
    setSearch('')
    setSelectedType('')
    setSelectedGrape('')
    setSelectedCountry('')
    setIgnoreLocationCountry(true)
    setSelectedRegion('')
    setPage(0)
    setSearchParams(new URLSearchParams({ country: '' }), { replace: true })
  }, [setSearchParams])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      setPage(0)
      updateUrl(value, 0)
    },
    [updateUrl],
  )

  const handleTypeChange = useCallback((value: string) => {
    setSelectedType(value as WineType | '')
    setPage(0)
  }, [])

  const handleGrapeChange = useCallback((value: string) => {
    setSelectedGrape(value)
    setPage(0)
  }, [])

  const handleCountryChange = useCallback((value: string) => {
    setIgnoreLocationCountry(true)
    setSelectedCountry(value)
    setSelectedRegion('')
    setPage(0)
    const params = new URLSearchParams(searchParams)
    params.set('country', value)
    params.delete('region')
    params.delete('page')
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  const handleRegionChange = useCallback((value: string) => {
    setSelectedRegion(value)
    setPage(0)
  }, [])

  const english = i18n?.language?.startsWith('en') === true
  const typeOptions = wineTypes.map((item) => ({
    value: item.value,
    label: wineTypeLabel(t, item.value, english ? item.names.en : item.names.es),
  }))

  return {
    t,
    locationStatus: resolvingCountry ? 'locating' : effectiveCountry ? 'country' : 'global',
    search,
    selectedType,
    selectedGrape: effectiveSelectedGrape,
    selectedCountry: effectiveCountry,
    selectedCountryLabel: countryName(effectiveCountry),
    selectedRegion,
    page,
    wines,
    isLoading: resolvingCountry || isLoading,
    isError,
    retry: refetch,
    error,
    pagination,
    totalWines,
    totalPages,
    hasActiveFilters,
    grapeTypes,
    countryOptions,
    regionOptions,
    typeOptions,
    handleSearchChange,
    handleTypeChange,
    handleGrapeChange,
    handleCountryChange,
    handleRegionChange,
    handlePageChange,
    clearFilters,
  }
}
