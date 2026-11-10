import type { OrganizerPayment } from '@/domain/event/organizerPayment';
export interface OrganizerPaymentsClient {
  list(eventId: string, registrationIds: string[]): Promise<OrganizerPayment[]>;
  refund(attemptId: string): Promise<void>;
}
