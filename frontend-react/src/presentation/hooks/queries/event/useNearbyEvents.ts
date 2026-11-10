/**
 * useNearbyEvents — geolocation-based event list query
 *
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { eventsService, type EventsResult } from '@services/events.service'

export function useNearbyEvents(
  latitude: number | null,
  longitude: number | null,
  radiusKm = 50,
  page = 0,
  pageSize = 20,
) {
  return useQuery<EventsResult>({
    queryKey: queryKeys.events.nearby({ latitude, longitude, radiusKm, page, pageSize }),
    queryFn: () =>
      eventsService.getNearbyEvents(latitude!, longitude!, radiusKm, page, pageSize),
    enabled: latitude !== null && longitude !== null,
    placeholderData: keepPreviousData,
  })
}

