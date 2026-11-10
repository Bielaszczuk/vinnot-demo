import { skipToken } from '@reduxjs/toolkit/query';
import { useExecuteMutationMutation, useTypedQuery } from '@/presentation/store/api';
import { useMutationAdapter } from '@/presentation/store/mutationAdapter';
import type { OrganizerPayment } from '@/domain/event/organizerPayment';
export function useOrganizerPayments(eventId: string, registrationIds: string[]) {
  return useTypedQuery<OrganizerPayment[]>(registrationIds.length
    ? { key: 'event.organizerPayments', params: { eventId, registrationIds: [...registrationIds].sort() } }
    : skipToken, { refetchOnMountOrArgChange: true });
}
export function useRequestPaymentRefund(eventId: string) {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter((attemptId: string) => trigger({ key: 'event.refund', params: { eventId, attemptId } }), state);
}
