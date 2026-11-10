export interface EventTicketDto {
  id: string; eventId: string; title: string; description: string | null;
  imageUrl: string | null; eventStatus: string; startDate: string; endDate: string;
  locationName: string | null; locationAddress: string | null; locationCity: string | null;
  contactEmail: string | null; contactPhone: string | null; status: string; paymentStatus: string;
  attendeeCount: number; totalAmount: number; currency: string; expiresAt: string | null;
}
export interface TicketPageDto { content: EventTicketDto[]; pageNumber: number; totalPages: number; totalItems: number }
