export interface EventTicket {
  id: string; eventId: string; title: string; description: string | null;
  imageUrl: string | null; eventStatus: string; startDate: Date; endDate: Date;
  locationName: string | null; locationAddress: string | null; locationCity: string | null;
  contactEmail: string | null; contactPhone: string | null; status: string; paymentStatus: string;
  attendeeCount: number; totalAmount: number; currency: string; expiresAt: Date | null;
}
export interface TicketPage { tickets: EventTicket[]; page: number; totalPages: number; totalElements: number }
export type PaymentReceiptStatus = 'PENDING' | 'CONFIRMED' | 'NOT_COMPLETED' | 'REFUND_PENDING' | 'REFUNDED' | 'REVIEW';
