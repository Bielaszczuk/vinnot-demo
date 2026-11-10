import { useQuery } from "@tanstack/react-query";
import { eventTicketsService } from "@/application/services/eventTickets.service";
export function useMyTickets(page: number) {
  return useQuery({
    queryKey: ["myTickets", page],
    queryFn: () => eventTicketsService.list(page),
    staleTime: 0,
  });
}
export function useMyTicket(id: string | undefined) {
  return useQuery({
    queryKey: ["myTickets", "detail", id],
    queryFn: () => eventTicketsService.get(id!),
    enabled: !!id,
    staleTime: 0,
  });
}
export function usePaymentReceipt(token: string | null) {
  return useQuery({
    queryKey: ["paymentReceipt", token],
    queryFn: () => eventTicketsService.receipt(token!),
    enabled: !!token,
    retry: false,
    gcTime: 0,
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data === "PENDING" && query.state.dataUpdateCount < 24
        ? 5000
        : false,
    refetchIntervalInBackground: false,
  });
}
