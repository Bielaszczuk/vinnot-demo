/**
 * useCreateEvent — mutation to create a new event
 *
 * Invalidates event list queries after successful creation.
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { eventsService } from '@services/events.service'
import type { Event } from '@domain/event/event.types'

type CreateEventInput = Omit<Event, 'id' | 'currentAttendees' | 'status' | 'createdAt' | 'updatedAt'>

export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation<Event, Error, CreateEventInput>({
    mutationFn: (data: CreateEventInput) => eventsService.createEvent(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() })
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.events.all, 'nearby'] })
    },
  })
}

