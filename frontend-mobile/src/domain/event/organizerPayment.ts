export type RefundStatus = 'NONE' | 'PREPARED' | 'SENDING' | 'UNCERTAIN' | 'SUCCEEDED' | 'REVIEW' | 'REJECTED';
export interface OrganizerPayment {
  registrationId: string;
  attemptId: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  refundStatus: RefundStatus;
  canRefund: boolean;
}
export function refundIsProcessing(status: RefundStatus): boolean {
  return status === 'PREPARED' || status === 'SENDING' || status === 'UNCERTAIN';
}
/** Mercado Pago rejected the refund and moved no money: the organizer may request it again. */
export function refundCanBeRetried(status: RefundStatus): boolean {
  return status === 'REJECTED';
}
