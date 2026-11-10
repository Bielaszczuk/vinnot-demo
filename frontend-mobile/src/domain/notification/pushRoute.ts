import { safeNativeIntent } from "@/domain/navigation/nativeIntent";

/**
 * The screens a push may open. A push route comes from the server, but is still untrusted input:
 * anything that is not one of these in-app paths is ignored instead of navigated to.
 */
const LIST_WITH_DETAIL = /^\/(?:my-tickets|events|wines|routes|wine-routes|wineries)(?:\/[A-Za-z0-9-]{1,64})?$/;
const EXACT = new Set(["/partner", "/partner/events", "/points"]);
/** Sibling screens a detail id must never be mistaken for (a push must not open the camera, for instance). */
const NOT_AN_ID = new Set(["scan", "compare", "submissions", "index"]);

function isPushScreen(path: string): boolean {
  if (EXACT.has(path)) return true;
  if (!LIST_WITH_DETAIL.test(path)) return false;
  const detail = path.split("/")[2];
  return detail === undefined || !NOT_AN_ID.has(detail.toLowerCase());
}

export function toPushRoute(url: unknown): string | null {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) return null;
  const safe = safeNativeIntent(url);
  if (safe === "/") return null;
  const path = safe.split(/[?#]/)[0]!.replace(/\/+$/, "");
  return isPushScreen(path) ? path : null;
}
