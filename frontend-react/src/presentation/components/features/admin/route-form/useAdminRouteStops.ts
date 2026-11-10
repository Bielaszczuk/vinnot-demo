import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { useGeocoding } from '@hooks/useGeocoding'
import type { AdminRouteStop, AdminWinery } from '@domain/admin/admin.types'
import {
  buildWineryGeocodeQuery,
  createEmptyRouteStopDraft,
  createManualRouteStop,
  createWineryRouteStop,
  moveRouteStop,
  removeRouteStopAt,
  type AdminRouteStopDraft,
} from '@domain/admin/adminRouteStops'
import type { AdminWineryPickerState } from '@components/features/admin/wine-form/useAdminWineEditor'

/**
 * Stops of the route being edited. They live in React state rather than in the
 * form values so a stop keeps its identity: a late geocoding result only lands
 * on the exact stop it was asked for, never on one that moved or changed since.
 */
export function useAdminRouteStops(initialStops: AdminRouteStop[], winery: AdminWineryPickerState) {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const { geocodeAddress } = useGeocoding()
  const [stops, updateStops] = useState(initialStops)
  const latest = useRef(stops)
  const alive = useRef(true)
  const [newWineryName, setNewWineryName] = useState<string | null>(null)
  const [wineryBusy, setWineryBusy] = useState(false)
  const [searchIndex, setSearchIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [newStop, setNewStop] = useState<AdminRouteStopDraft>(createEmptyRouteStopDraft)
  const [newStopError, setNewStopError] = useState(false)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  /** The stops as they are right now, for event handlers and validation that run between renders. */
  const currentStops = useCallback(() => latest.current, [])

  const setStops = useCallback((next: (current: AdminRouteStop[]) => AdminRouteStop[]) => {
    latest.current = next(latest.current)
    updateStops(latest.current)
  }, [])

  /** Puts the found coordinates on `expected` when that exact stop is still in the route. */
  const placeStop = useCallback((expected: AdminRouteStop, place: (stop: AdminRouteStop) => AdminRouteStop) => {
    if (!alive.current || !latest.current.includes(expected)) return false
    setStops((current) => current.map((stop) => (stop === expected ? place(stop) : stop)))
    return true
  }, [setStops])

  const locateWinery = useCallback(async (found: AdminWinery, stop: AdminRouteStop) => {
    const warn = () => addToast({ type: 'warning', message: t('admin.routes.toastWineryWithoutGps', { winery: found.name }) })
    try {
      const result = await geocodeAddress(buildWineryGeocodeQuery(found))
      if (!alive.current) return
      const location = result.ok ? result.location : undefined
      if (!location) return warn()
      const placed = placeStop(stop, (current) => ({
        ...current, latitude: location.latitude, longitude: location.longitude, address: current.address || location.formattedAddress,
      }))
      if (placed) addToast({ type: 'success', message: t('admin.routes.toastWineryGeocoded', { winery: found.name }) })
    } catch {
      if (alive.current) warn()
    }
  }, [addToast, geocodeAddress, placeStop, t])

  const addWinery = useCallback((found: AdminWinery) => {
    const description = t('admin.routes.wineryStopDescription', { place: found.regionName || found.countryName || '' })
    const stop = createWineryRouteStop(found, description, latest.current.length + 1)
    setStops((current) => [...current, stop])
    winery.setQuery('')
    setNewWineryName(null)
    if (found.latitude == null || found.longitude == null) void locateWinery(found, stop)
  }, [locateWinery, setStops, t, winery])

  const wineryCreated = useCallback((created: AdminWinery) => {
    addWinery(created)
    addToast({ type: 'success', message: t('admin.routes.form.wineryCreated', { name: created.name }) })
  }, [addToast, addWinery, t])

  const focusLocationSearch = (index: number) => {
    if (searchIndex === index && searchQuery.trim()) return
    const stop = latest.current[index]
    setSearchIndex(index)
    setSearchQuery(stop ? stop.address || stop.name : '')
  }

  const changeLocationSearch = (index: number, value: string) => {
    setSearchIndex(index)
    setSearchQuery(value)
  }

  const searchLocation = async (index: number) => {
    const expected = latest.current[index]
    const query = (searchIndex === index ? searchQuery : '').trim()
    if (!expected || !query) {
      addToast({ type: 'warning', message: t('admin.common.toastGeoRequired') })
      return
    }
    setSearchIndex(index)
    setGeocoding(true)
    try {
      const result = await geocodeAddress(query)
      if (!alive.current) return
      const location = result.ok ? result.location : undefined
      if (!location) {
        addToast(result.status === 'NO_API_KEY'
          ? { type: 'error', message: t('admin.common.toastGeoMissingKey') }
          : { type: 'warning', message: t('admin.common.toastGeoNotFound') })
        return
      }
      const placed = placeStop(expected, (stop) => ({
        ...stop, latitude: location.latitude, longitude: location.longitude, address: location.formattedAddress,
      }))
      if (!placed) return
      addToast({ type: 'success', message: t('admin.routes.toastLocationUpdated', { address: location.formattedAddress }) })
      setSearchQuery('')
      setSearchIndex(null)
    } catch {
      if (alive.current) addToast({ type: 'error', message: t('admin.common.toastGeoError') })
    } finally {
      if (alive.current) setGeocoding(false)
    }
  }

  const selectLocation = (index: number, latitude: number, longitude: number) => {
    setStops((current) => current.map((stop, position) => (position === index ? { ...stop, latitude, longitude } : stop)))
  }

  const changeDuration = (index: number, value: string) => {
    const minutes = value === '' ? 0 : Number(value)
    setStops((current) => current.map((stop, position) => (position === index ? { ...stop, estimatedDuration: minutes } : stop)))
  }

  const changeNewStop = (fields: Partial<AdminRouteStopDraft>) => {
    setNewStop((current) => ({ ...current, ...fields }))
    if (fields.name?.trim()) setNewStopError(false)
  }

  const addManualStop = () => {
    if (!newStop.name.trim()) {
      setNewStopError(true)
      return
    }
    setStops((current) => [...current, createManualRouteStop(newStop, current.length + 1)])
    setNewStop(createEmptyRouteStopDraft())
    setNewStopError(false)
  }

  return {
    stops, currentStops,
    winery, addWinery, newWineryName, startWineryCreation: setNewWineryName,
    cancelWineryCreation: () => setNewWineryName(null), wineryCreated, wineryBusy, setWineryBusy,
    moveStop: (index: number, direction: 'up' | 'down') => setStops((current) => moveRouteStop(current, index, direction)),
    removeStop: (index: number) => setStops((current) => removeRouteStopAt(current, index)),
    changeDuration, selectLocation,
    locationSearch: (index: number) => (searchIndex === index ? searchQuery : ''),
    focusLocationSearch, changeLocationSearch, searchLocation,
    isGeocoding: (index: number) => geocoding && searchIndex === index,
    newStop, changeNewStop, newStopError, addManualStop,
  }
}

export type AdminRouteStopsEditor = ReturnType<typeof useAdminRouteStops>
