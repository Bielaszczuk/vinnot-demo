/**
 * Wine route presentation helpers.
 */
import type { RouteDifficulty } from "@/domain/route/route.types";

export const ROUTE_DIFFICULTY_OPTIONS: { value: RouteDifficulty }[] = [
  { value: "short" },
  { value: "medium" },
  { value: "long" },
];

export function formatRouteDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}min`;
}

type Translate = (key: string, options?: { count?: number }) => string;

/** Minutes when the route has them, otherwise its days; empty when it has no length. */
export function formatRouteLength(minutes: number, days: number | null, t: Translate): string {
  if (minutes > 0) return formatRouteDuration(minutes);
  if (days && days > 0) return t("wineRoutes.days", { count: days });
  return "";
}

export function formatRouteDistance(km: number): string {
  if (!km || km <= 0) return "0 km";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
