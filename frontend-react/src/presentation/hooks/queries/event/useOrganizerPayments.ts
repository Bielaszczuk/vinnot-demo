import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizerPaymentsService } from '@/application/services/organizerPayments.service';
import { refundIsProcessing } from '@/domain/event/organizerPayment';
import { queryKeys } from '@hooks/queries/queryKeys';
export function useOrganizerPayments(eventId: string, registrationIds: string[]) {
  const ids = [...registrationIds].sort();
  return useQuery({
    queryKey: ['events', eventId, 'organizerPayments', ids],
    queryFn: () => organizerPaymentsService.list(eventId, ids),
    enabled: !!eventId && ids.length > 0,
    refetchInterval: (query) => query.state.data?.some(p => refundIsProcessing(p.refundStatus)) ? 10000 : false,
    refetchIntervalInBackground: false,
  });
}
export function useRequestPaymentRefund(eventId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (attemptId: string) => organizerPaymentsService.refund(attemptId),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ predicate: q => q.queryKey[0] === 'events' && q.queryKey.includes(eventId) }),
        client.invalidateQueries({ queryKey: queryKeys.partner.events.all() }),
      ]);
    },
  });
}
