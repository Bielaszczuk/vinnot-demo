import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWinery } from '@hooks/queries/winery/useWinery'
import { useWineryWines } from '@hooks/queries/winery/useWineryWines'
import { useUpdateWineryCoordinates } from '@hooks/queries/winery/useUpdateWineryCoordinates'
import { useGeocoding } from '@hooks/useGeocoding'
import { useBackNavigation } from '@hooks/useBackNavigation'
import { useCountryName } from '@hooks/useCountryName'
import { isNotFoundError } from '@/presentation/feedback/illustratedState'
import type { Winery } from '@domain/winery/winery.types'
import { localizedWineryDescription } from '@domain/winery/winery.mappers'

export function useWineryDetailsViewModel() {
  const { t, i18n } = useTranslation()
  const countryName = useCountryName()
  const { id } = useParams<{ id: string }>()

  const { data: winery, isLoading, isError, error, refetch } = useWinery(id)
  const loadFailed = isError && !winery && !isNotFoundError(error)
  const { data: winesData, isLoading: loadingWines } = useWineryWines(id, 0, 20)
  const updateCoordinates = useUpdateWineryCoordinates()
  const { geocodeAddress } = useGeocoding()
  const [resolvedById, setResolvedById] = useState<Record<string, Partial<Winery>>>({})
  const geocodeAttemptedRef = useRef<string | null>(null)

  const wines = winesData?.wines ?? []

  useEffect(() => {
    if (!winery || !id) return
    const currentWinery = winery
    const currentId = id
    const resolvedEntry = resolvedById[id]
    const latitude = resolvedEntry?.latitude ?? currentWinery.latitude
    const longitude = resolvedEntry?.longitude ?? currentWinery.longitude
    if (latitude && longitude) return

    const requestKey = `${currentId}:${currentWinery.name}`
    if (geocodeAttemptedRef.current === requestKey) return
    geocodeAttemptedRef.current = requestKey

    async function geocodeAndPersistCoordinates() {
      const parts = [currentWinery.name]
      if (currentWinery.regionName) parts.push(currentWinery.regionName)
      if (currentWinery.countryName) parts.push(currentWinery.countryName)
      const searchQuery = parts.join(', ')

      try {
        const geocodeResult = await geocodeAddress(searchQuery)
        if (!geocodeResult.ok || !geocodeResult.location) {
          return
        }
        const location = geocodeResult.location
        const nextAddress = currentWinery.address || location.formattedAddress || null
        setResolvedById((prev) => ({
          ...prev,
          [currentId]: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: nextAddress,
          },
        }))

        try {
          await updateCoordinates.mutateAsync({
            id: currentId,
            latitude: location.latitude,
            longitude: location.longitude,
            address: nextAddress,
          })
        } catch (persistError) {
          console.error('Error persisting winery coordinates:', persistError)
        }
      } catch (error) {
        console.error('Winery geocode error:', error)
      }
    }

    void geocodeAndPersistCoordinates()
  }, [geocodeAddress, id, resolvedById, updateCoordinates, winery])

  const displayWinery = useMemo(() => {
    if (!winery) return null
    if (!id) return winery
    const resolvedEntry = resolvedById[id]
    if (!resolvedEntry) return winery
    return {
      ...winery,
      latitude: resolvedEntry.latitude ?? winery.latitude,
      longitude: resolvedEntry.longitude ?? winery.longitude,
      address: resolvedEntry.address ?? winery.address,
    }
  }, [id, resolvedById, winery])

  const mapQuery = useMemo(() => {
    if (!displayWinery) return null

    if (displayWinery.latitude && displayWinery.longitude) {
      return `${displayWinery.latitude},${displayWinery.longitude}`
    }
    if (displayWinery.address) return displayWinery.address
    return displayWinery.name
  }, [displayWinery])

  const websiteUrl = displayWinery?.website ?? null
  const emailAddress = displayWinery?.email ?? null
  const phoneNumber = displayWinery?.phone ?? null
  const establishedYear = displayWinery?.establishedYear ?? null
  const description = localizedWineryDescription(displayWinery, i18n.language)
  const hasContactInfo = !!(emailAddress || phoneNumber || displayWinery?.address)

  const locationParts: string[] = []
  if (displayWinery?.subregion) locationParts.push(displayWinery.subregion)
  if (displayWinery?.regionName) locationParts.push(displayWinery.regionName)
  if (displayWinery?.countryName) locationParts.push(countryName(displayWinery.countryName))
  const locationText = locationParts.join(', ')

  const goBack = useBackNavigation('/wines')

  return {
    t,
    isLoading,
    isError,
    loadFailed,
    loadError: error,
    retry: () => void refetch(),
    loadingWines,
    wines,
    displayWinery,
    mapQuery,
    websiteUrl,
    emailAddress,
    phoneNumber,
    establishedYear,
    description,
    hasContactInfo,
    locationText,
    goBack,
  }
}
