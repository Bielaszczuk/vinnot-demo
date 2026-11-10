import redgrapes from '@assets/routes/redgrapes.webp'
import wineriecavabar from '@assets/routes/wineriecavabar.webp'
import winewithmap from '@assets/routes/winewithmap.webp'
import wineyard from '@assets/routes/wineyard.webp'
import { hasCoordinates } from '@domain/location/coordinates'
import { useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useWineRoute } from '@hooks/queries/wineRoute/useWineRoute'
import { useShareLink } from '@hooks/useShareLink'
import { useBackNavigation } from '@hooks/useBackNavigation'
import { isPublicRoute } from '@domain/sharing/publicContent'

export const DIFFICULTY_CONFIG: Record<
  string,
  { color: string; bg: string }
> = {
  short: { color: 'text-success', bg: 'bg-success-soft ring-success/20' },
  medium: { color: 'text-rating', bg: 'bg-warning-soft ring-rating/20' },
  long: { color: 'text-wine-700', bg: 'bg-wine-50 ring-wine-200/60' },
}

const ROUTE_DEFAULT_IMAGES = [
  wineyard,
  winewithmap,
  wineriecavabar,
  redgrapes,
]

function defaultImage(): string {
  return ROUTE_DEFAULT_IMAGES[Math.floor(Math.random() * ROUTE_DEFAULT_IMAGES.length)]!
}

export function useWineRouteDetailsViewModel() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const shareLink = useShareLink()

  const { data: wineRoute, isLoading, isError, error, refetch } = useWineRoute(id)

  const totalDurationMinutes = useMemo(() => {
    if (!wineRoute) return 0
    const stopsSum = wineRoute.stops.reduce((sum, stop) => sum + (stop.duration || 0), 0)
    if (stopsSum > 0) return stopsSum
    return wineRoute.duration > 0 ? wineRoute.duration : 0
  }, [wineRoute])

  const totalDistanceKm = useMemo(() => {
    if (!wineRoute) return 0
    return wineRoute.distance || 0
  }, [wineRoute])

  const routeMapQuery = useMemo(() => {
    if (!wineRoute || !wineRoute.stops || wineRoute.stops.length === 0) return null

    const stops = wineRoute.stops
    if (stops.length === 1) {
      const stop = stops[0]
      if (!stop) return null
      if (hasCoordinates(stop.location)) {
        return {
          mode: 'place' as const,
          query: `${stop.location.latitude},${stop.location.longitude}`,
        }
      }
      return { mode: 'place' as const, query: stop.name }
    }

    const origin = stops[0]
    const destination = stops[stops.length - 1]
    if (!origin || !destination) return null
    const middleStops = stops.slice(1, -1)

    return {
      mode: 'directions' as const,
      origin:
        hasCoordinates(origin.location)
          ? `${origin.location.latitude},${origin.location.longitude}`
          : origin.name,
      destination:
        hasCoordinates(destination.location)
          ? `${destination.location.latitude},${destination.location.longitude}`
          : destination.name,
      waypoints: middleStops.map((stop) =>
        hasCoordinates(stop.location)
          ? `${stop.location.latitude},${stop.location.longitude}`
          : stop.name,
      ),
    }
  }, [wineRoute])

  const diffConf = wineRoute?.difficulty ? DIFFICULTY_CONFIG[wineRoute.difficulty] : null

  const goBack = useBackNavigation('/wine-routes')

  const goToRoutes = useCallback(() => {
    navigate('/wine-routes')
  }, [navigate])

  const startNavigation = useCallback(() => {
    if (!wineRoute || !wineRoute.stops || wineRoute.stops.length === 0) return

    const stops = wineRoute.stops
    const origin = stops[0]
    const destination = stops[stops.length - 1]
    if (!origin || !destination) return

    const waypoints = stops.slice(1, -1).map((stop) => {
      if (hasCoordinates(stop.location)) {
        return `${stop.location.latitude},${stop.location.longitude}`
      }
      return encodeURIComponent(stop.name)
    })

    let url = 'https://www.google.com/maps/dir/?api=1'
    if (hasCoordinates(origin.location)) {
      url += `&origin=${origin.location.latitude},${origin.location.longitude}`
    } else {
      url += `&origin=${encodeURIComponent(origin.name)}`
    }
    if (hasCoordinates(destination.location)) {
      url += `&destination=${destination.location.latitude},${destination.location.longitude}`
    } else {
      url += `&destination=${encodeURIComponent(destination.name)}`
    }
    if (waypoints.length > 0) {
      url += `&waypoints=${waypoints.join('|')}`
    }
    url += '&travelmode=driving'
    window.open(url, '_blank')
  }, [wineRoute])

  const shareRoute = useCallback(() => {
    if (!wineRoute) return
    return shareLink({ kind: 'wine-routes', id: wineRoute.id, title: wineRoute.name })
  }, [shareLink, wineRoute])

  return {
    t,
    id,
    wineRoute,
    isLoading,
    isError,
    error,
    retry: refetch,
    totalDurationMinutes,
    totalDistanceKm,
    routeMapQuery,
    diffConf,
    goBack,
    goToRoutes,
    startNavigation,
    shareRoute,
    canShare: !!wineRoute && isPublicRoute(wineRoute),
    defaultImage,
  }
}
