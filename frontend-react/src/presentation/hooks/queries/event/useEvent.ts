/**
 * useEvent — single event detail query
 *
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { eventsService } from '@services/events.service'
import type { Event } from '@domain/event/event.types'

export function useEvent(id: string | undefined) {
  return useQuery<Event>({
    queryKey: queryKeys.events.detail(id!),
    queryFn: () => eventsService.getEvent(id!),
    enabled: !!id,
  })
}

