/**
 * useCancelRegistration — mutation to cancel event registration
 *
 * Invalidates event queries after successful cancellation.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { invalidateMyPoints } from '@hooks/queries/user/pointsCache'
import { eventsService } from '@services/events.service'

export function useCancelRegistration() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (eventId: string) => eventsService.cancelRegistration(eventId),
    onSuccess: (_data, eventId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() })
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.events.all, 'nearby'] })
      invalidateMyPoints(queryClient)
    },
  })
}

