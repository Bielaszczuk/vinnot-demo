import { http } from "@/infrastructure/api/http";
import axios from "axios";
const receiptHttp = axios.create({ baseURL: http.defaults.baseURL, timeout: 15000 });
import type { EventTicketDto, TicketPageDto } from "@/infrastructure/api/dto/eventTicket.dto";
export const eventTicketsClient = {
  async list(page: number): Promise<TicketPageDto> {
    return (await http.get<TicketPageDto>("/me/tickets", { params: { page, size: 20 } })).data;
  },
  async get(id: string): Promise<EventTicketDto> {
    return (await http.get<EventTicketDto>(`/me/tickets/${encodeURIComponent(id)}`)).data;
  },
  async receipt(token: string): Promise<{ status: string }> {
    return (await receiptHttp.get<{ status: string }>("/payments/receipt", { params: { token } }))
      .data;
  },
};
