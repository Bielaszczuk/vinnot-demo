import { useMyTicket } from "@/presentation/hooks/queries/event/useMyTickets";
import { isTicketAbsent } from "@/domain/event/eventTicket";
import { normalizeError } from "@/shared/utils/apiError";

/** Ticket detail state: a truly absent ticket is "not found"; any other failure can be retried. */
export function useMyTicketDetailsViewModel(id: string | undefined) {
  const query = useMyTicket(id);
  const absent = query.isError && isTicketAbsent(normalizeError(query.error));
  return {
    ticket: query.isError ? undefined : query.data,
    isLoading: Boolean(query.isLoading),
    notFound: !id || absent || (!query.isLoading && !query.isError && !query.data),
    loadFailed: Boolean(query.isError) && !absent,
    retry: () => void query.refetch(),
  };
}
