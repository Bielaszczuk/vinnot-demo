import { mapEventPagination } from "./eventPagination";
import { eventTicketsClient } from "@/infrastructure/api/clients/eventTickets.client";
import type { EventTicket, TicketPage, PaymentReceiptStatus } from "@/domain/event/eventTicket";
type TicketInput = Omit<EventTicket, "startDate" | "endDate" | "expiresAt"> & {
  startDate: string;
  endDate: string;
  expiresAt: string | null;
};
export interface EventTicketsPort {
  list(
    page: number,
  ): Promise<{ content: TicketInput[]; pageNumber: number; totalPages: number; totalItems: number }>;
  get(id: string): Promise<TicketInput>;
  receipt(token: string): Promise<{ status: string }>;
}
function mapTicket(value: TicketInput): EventTicket {
  return {
    ...value,
    startDate: new Date(value.startDate),
    endDate: new Date(value.endDate),
    expiresAt: value.expiresAt ? new Date(value.expiresAt) : null,
  };
}
export function createEventTicketsService(client: EventTicketsPort) {
  return {
    async list(page = 0): Promise<TicketPage> {
      if (!Number.isInteger(page) || page < 0) throw new Error("Invalid page");
      const result = await client.list(page);
      const pagination = mapEventPagination(result, page);
      return {
        tickets: result.content.map(mapTicket),
        page: pagination.pageNumber,
        totalPages: pagination.totalPages,
        totalElements: pagination.totalItems,
      };
    },
    async get(id: string): Promise<EventTicket> {
      if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
        throw new Error("Invalid ticket");
      return mapTicket(await client.get(id));
    },
    async receipt(token: string): Promise<PaymentReceiptStatus> {
      if (!token || token.length > 512) throw new Error("Invalid receipt");
      const { status } = await client.receipt(token);
      if (
        !["PENDING", "CONFIRMED", "NOT_COMPLETED", "REFUND_PENDING", "REFUNDED", "REVIEW"].includes(
          status,
        )
      )
        throw new Error("Invalid receipt status");
      return status as PaymentReceiptStatus;
    },
  };
}
export const eventTicketsService = createEventTicketsService(eventTicketsClient);
