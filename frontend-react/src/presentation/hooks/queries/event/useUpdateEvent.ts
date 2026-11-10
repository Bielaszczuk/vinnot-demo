/**
 * useUpdateEvent — mutation to update an existing event
 *
 * Invalidates the specific event detail and list queries after update.
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { eventsService } from '@services/events.service'
import type { Event } from '@domain/event/event.types'

interface UpdateEventVars {
  id: string
  data: Partial<Event>
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation<Event, Error, UpdateEventVars>({
    mutationFn: ({ id, data }: UpdateEventVars) => eventsService.updateEvent(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() })
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.events.all, 'nearby'] })
    },
  })
}

