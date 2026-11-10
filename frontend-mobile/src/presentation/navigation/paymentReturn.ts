import { checkoutReturnDetails } from "@/domain/event/checkoutReturn";
import { paymentReturnNavigation } from "@/application/services/paymentReturnNavigation";

export function paymentReturnDestination(path: string): string | null {
  if (path.startsWith("vinnot://payments/return") || path.startsWith("/payments/return")) {
    if (path.length > 2048) return "/my-tickets";
    try {
      const url = new URL(path, "https://vinnot.com");
      const native =
        url.protocol === "vinnot:" && url.hostname === "payments" && url.pathname === "/return";
      const relative = path.startsWith("/payments/return?") && url.pathname === "/payments/return";
      if ((!native && !relative) || url.username || url.password || url.port || url.hash)
        return "/my-tickets";
      const details = checkoutReturnDetails(url.searchParams);
      if (!details) return "/my-tickets";
      const params = new URLSearchParams({ receipt: details.receipt });
      if (details.ticketId) params.set("ticketId", details.ticketId);
      return `/payments/return?${params}`;
    } catch {
      return "/my-tickets";
    }
  }
  return path === "vinnot://payments/connected" || path === "/payments/connected"
    ? paymentReturnNavigation.destination()
    : null;
}
