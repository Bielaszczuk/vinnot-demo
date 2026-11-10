export interface EventTicket {
  id: string; eventId: string; title: string; description: string | null;
  imageUrl: string | null; eventStatus: string; startDate: Date; endDate: Date;
  locationName: string | null; locationAddress: string | null; locationCity: string | null;
  contactEmail: string | null; contactPhone: string | null; status: string; paymentStatus: string;
  attendeeCount: number; totalAmount: number; currency: string; expiresAt: Date | null;
}
export interface TicketPage { tickets: EventTicket[]; page: number; totalPages: number; totalElements: number }
export type PaymentReceiptStatus = 'PENDING' | 'CONFIRMED' | 'NOT_COMPLETED' | 'REFUND_PENDING' | 'REFUNDED' | 'REVIEW';
/** A ticket is absent (not merely failing to load) when the API denies or cannot find it. */
export function isTicketAbsent(failure: { status?: number; code?: string }): boolean {
  return failure.status === 404 || failure.status === 403
    || failure.code === 'NOT_FOUND' || failure.code === 'FORBIDDEN';
}
