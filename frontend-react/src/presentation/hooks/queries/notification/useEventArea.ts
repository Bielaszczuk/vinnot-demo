/**
 * "Events near you" area hooks.
 * Flow: page → hook → notificationsService → notificationsClient → http
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { notificationsService } from '@services/notifications.service'
import type { EventArea } from '@domain/notification/eventArea'

export type EventAreaChange = { type: 'region'; regionId: string } | { type: 'clear' }

export function useEventArea(enabled = true) {
  return useQuery<EventArea | null>({
    queryKey: queryKeys.users.eventArea(),
    queryFn: () => notificationsService.getEventArea(),
    enabled,
  })
}

/** The server owns the area (it names the region), so every change re-reads it. */
export function useUpdateEventArea() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, EventAreaChange>({
    mutationFn: (change) => change.type === 'clear'
      ? notificationsService.clearEventArea()
      : notificationsService.setEventAreaRegion(change.regionId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.eventArea() }),
  })
}
