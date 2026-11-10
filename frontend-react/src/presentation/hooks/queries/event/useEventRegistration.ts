import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { eventsService } from '@services/events.service'
import type {
  EventPaymentMethod,
  EventRegistration,
} from '@domain/event/event.types'

export function useMyEventRegistration(eventId: string | undefined, enabled: boolean) {
  const queryClient = useQueryClient()
  return useQuery<EventRegistration>({
    queryKey: queryKeys.events.myRegistration(eventId!),
    queryFn: async () => {
      const previous = queryClient.getQueryData<EventRegistration>(queryKeys.events.myRegistration(eventId!))
      const registration = await eventsService.getMyRegistration(eventId!)
      if (previous && previous.status !== registration.status) {
        // Settlement can change capacity without a mutation in this browser.
        void queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId!), exact: true })
      }
      return registration
    },
    enabled: enabled && !!eventId,
    retry: false,
    refetchInterval: query => {
      const registration = query.state.data
      return registration?.externallyManagedPayment && registration.status === 'AWAITING_PAYMENT'
        && registration.expiresAt && new Date(registration.expiresAt).getTime() > Date.now() ? 5000 : false
    },
  })
}

export function useConfirmEventAttendance(eventId: string) {
  return useRegistrationMutation(
    (registrationId: string) => eventsService.confirmAttendance(registrationId),
    eventId,
  )
}

export function useReportEventPayment(eventId: string) {
  return useRegistrationMutation(
    ({ registrationId, paymentMethod }: {
      registrationId: string
      paymentMethod: EventPaymentMethod
    }) => eventsService.reportPayment(registrationId, paymentMethod),
    eventId,
  )
}

function useRegistrationMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<EventRegistration>,
  eventId: string,
) {
  const queryClient = useQueryClient()
  return useMutation<EventRegistration, Error, TVariables>({
    mutationFn,
    onSuccess: (registration) => {
      queryClient.setQueryData(
        queryKeys.events.myRegistration(eventId),
        registration,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) })
    },
  })
}
