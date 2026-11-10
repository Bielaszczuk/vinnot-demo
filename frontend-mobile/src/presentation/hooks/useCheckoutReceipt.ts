import { useEffect, useState, useCallback } from "react";
import { eventTicketsService } from "@/application/services/eventTickets.service";
import type { PaymentReceiptStatus } from "@/domain/event/eventTicket";

/** Bounded polling for asynchronous reconciliation; unmount cancels timers and ignores late responses. */
export function useCheckoutReceipt(token: string | null) {
  const [result, setResult] = useState<{
    token: string | null;
    status: PaymentReceiptStatus | "UNAVAILABLE";
    /** The manual refresh this answer belongs to. */
    refresh: number;
  } | null>(null);
  const [refresh, setRefresh] = useState(0);
  // Remote response callback, not a copy of props into presentation state.
  const receive = useCallback((value: NonNullable<typeof result>) => setResult(value), []);
  useEffect(() => {
    if (!token) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const load = async () => {
      try {
        const status = await eventTicketsService.receipt(token);
        if (!active) return;
        receive({ token, status, refresh });
        if (status === "PENDING" && ++attempts < 24) timer = setTimeout(() => void load(), 5000);
      } catch {
        if (active) receive({ token, status: "UNAVAILABLE", refresh });
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [token, refresh, receive]);
  return {
    status: !token
      ? ("UNAVAILABLE" as const)
      : result?.token === token
        ? result.status
        : ("PENDING" as const),
    refresh: useCallback(() => setRefresh((value) => value + 1), []),
    /** A manual refresh is waiting for its answer. */
    refreshing: !!token && refresh > 0 && !(result?.token === token && result.refresh === refresh),
  };
}
