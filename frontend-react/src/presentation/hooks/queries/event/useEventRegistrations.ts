import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { eventsService } from '@services/events.service'
import type {
  EventPaymentMethod,
  EventRegistration,
  EventRegistrationAction,
  EventRegistrationStatus,
} from '@domain/event/event.types'

interface ReviewRegistrationVariables {
  registrationId: string
  action: EventRegistrationAction
  paymentMethod?: EventPaymentMethod
  organizerNote?: string
}

export function useEventRegistrations(
  eventId: string | undefined,
  status: EventRegistrationStatus | undefined,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: queryKeys.events.registrations(eventId!, {
      status,
      page,
      pageSize,
    }),
    queryFn: () =>
      eventsService.getEventRegistrations(eventId!, status, page, pageSize),
    enabled: !!eventId,
    placeholderData: keepPreviousData,
  })
}

export function useReviewEventRegistration(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation<EventRegistration, Error, ReviewRegistrationVariables>({
    mutationFn: ({
      registrationId,
      action,
      paymentMethod,
      organizerNote,
    }) =>
      eventsService.reviewRegistration(
        eventId,
        registrationId,
        action,
        paymentMethod,
        organizerNote,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(eventId),
      })
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'events'
          && query.queryKey.includes('registrations')
          && query.queryKey.includes(eventId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.partner.events.all(),
      })
    },
  })
}
