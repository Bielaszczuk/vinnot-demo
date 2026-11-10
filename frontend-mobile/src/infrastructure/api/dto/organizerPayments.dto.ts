/** Transport contract for the organizer financial projection. */
export interface OrganizerPaymentDto {
  registrationId: string;
  attemptId: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  refundStatus: 'NONE' | 'PREPARED' | 'SENDING' | 'UNCERTAIN' | 'SUCCEEDED' | 'REVIEW' | 'REJECTED';
  canRefund: boolean;
}
