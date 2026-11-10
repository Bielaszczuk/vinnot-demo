import { http } from '@/infrastructure/api/http';
import type { OrganizerPaymentsClient } from '@/application/ports/OrganizerPayments';
import type { OrganizerPaymentDto } from '@/infrastructure/api/dto/organizerPayments.dto';
export const organizerPaymentsClient: OrganizerPaymentsClient = {
  async list(eventId, registrationIds) {
    return (await http.get<OrganizerPaymentDto[]>(`/payments/events/${eventId}/registrations`, {
      params: { registrationIds: registrationIds.join(',') },
    })).data;
  },
  async refund(attemptId) { await http.post(`/payments/checkouts/${attemptId}/refund`); },
};
