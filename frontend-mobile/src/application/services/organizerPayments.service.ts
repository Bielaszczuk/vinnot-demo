import type { OrganizerPaymentsClient } from '@/application/ports/OrganizerPayments';
import { organizerPaymentsClient } from '@/infrastructure/api/clients/organizerPayments.client';
export function createOrganizerPaymentsService(client: OrganizerPaymentsClient) {
  return {
    async list(eventId: string, registrationIds: string[]) {
      if (!registrationIds.length) return [];
      if (registrationIds.length > 50) throw new Error('Too many registrations');
      return client.list(eventId, [...new Set(registrationIds)].sort());
    },
    async refund(attemptId: string) {
      if (!attemptId) throw new Error('Missing payment reference');
      await client.refund(attemptId);
    },
  };
}
export const organizerPaymentsService = createOrganizerPaymentsService(organizerPaymentsClient);
