import { skipToken } from "@reduxjs/toolkit/query";
import { useTypedQuery } from "@/presentation/store/api";
import type { EventTicket, TicketPage } from "@/domain/event/eventTicket";
export function useMyTickets(page: number) {
  return useTypedQuery<TicketPage>(
    { key: "event.myTickets", params: { page } },
    { refetchOnMountOrArgChange: true },
  );
}
export function useMyTicket(id: string | undefined) {
  return useTypedQuery<EventTicket>(id ? { key: "event.myTicket", params: { id } } : skipToken, {
    refetchOnMountOrArgChange: true,
  });
}
