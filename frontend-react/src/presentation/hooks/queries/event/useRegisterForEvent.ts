import { useAuthStore } from '@stores/auth.store'
/**
 * useRegisterForEvent — mutation to register for an event
 *
 * Invalidates event queries after successful registration.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { invalidateMyPoints } from '@hooks/queries/user/pointsCache'
import { eventsService } from '@services/events.service'
import type {
  EventRegistration,
  RegisterForEventInput,
} from '@domain/event/event.types'

export function useRegisterForEvent() {
  const queryClient = useQueryClient()

  return useMutation<
    EventRegistration,
    Error,
    { eventId: string; input: RegisterForEventInput }
  >({
    mutationFn: ({ eventId, input }) =>
      eventsService.registerForEvent(eventId, input),
    onSuccess: (registration, { eventId, input }) => {
      const auth = useAuthStore.getState()
      if (input.saveContactPhone && auth.user?.id === registration.userId) {
        auth.setUser({ ...auth.user, phoneNumber: registration.contactPhone })
      }
      queryClient.setQueryData(
        queryKeys.events.myRegistration(eventId),
        registration,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() })
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.events.all, 'nearby'] })
      invalidateMyPoints(queryClient)
    },
  })
}
