/**
 * useEvents — paginated event list query
 *
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { eventsService, type EventsResult } from '@services/events.service'
import type { EventFilter } from '@domain/event/event.types'

export function useEvents(filter?: EventFilter, page = 0, pageSize = 20, enabled = true) {
  return useQuery<EventsResult>({
    enabled,
    queryKey: queryKeys.events.list({ ...filter, page, pageSize }),
    queryFn: () => eventsService.getEvents(filter, page, pageSize),
    placeholderData: keepPreviousData,
  })
}
