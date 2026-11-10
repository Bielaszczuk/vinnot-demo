import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { eventsService } from '@services/events.service'
import type { EventDiscoveryResult } from '@domain/event/event.types'

export function useDiscoverEvents(
  latitude: number | null,
  longitude: number | null,
  radiusKm = 100,
  page = 0,
  pageSize = 20,
  enabled = true,
) {
  return useQuery<EventDiscoveryResult>({
    queryKey: queryKeys.events.discovery({
      latitude,
      longitude,
      radiusKm,
      page,
      pageSize,
    }),
    queryFn: () =>
      eventsService.discoverEvents(
        latitude!,
        longitude!,
        radiusKm,
        page,
        pageSize,
      ),
    enabled: enabled && latitude !== null && longitude !== null,
    placeholderData: keepPreviousData,
  })
}
