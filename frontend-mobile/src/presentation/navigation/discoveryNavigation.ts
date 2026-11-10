import type { Href, ImperativeRouter } from "expo-router";
import { HOME_ROUTE } from "./wineNavigation";

export const CELLAR_ROUTE = "/(app)/cellar";
export const WINE_ROUTES_ROUTE = "/(app)/(tabs)/routes";
export const WINERIES_ROUTE = "/(app)/wineries";
export const PROFILE_ROUTE = "/(app)/(tabs)/profile";
export const ADMIN_ROUTE = "/(app)/admin";
export const ADMIN_WINES_ROUTE = "/(app)/admin/wines";
export const POINTS_ROUTE = "/(app)/points";

type BackRouter = Pick<ImperativeRouter, "canGoBack" | "back" | "replace">;

/**
 * Back with a fallback: a screen opened from a deep link or a notification has no
 * in-app history, so Back goes to the matching list instead of doing nothing.
 */
export function goBackOr(router: BackRouter, fallback: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

export function exitCellar(router: BackRouter): void {
  goBackOr(router, HOME_ROUTE);
}

export function createWineryDetailRoute(id: string): Href {
  return { pathname: "/(app)/wineries/[id]", params: { id } };
}

export function createWineRouteDetailRoute(id: string, origin: "home" | "routes" = "routes"): Href {
  return {
    pathname: origin === "home" ? "/(app)/wine-routes/[id]" : "/(app)/(tabs)/routes/[id]",
    params: { id },
  };
}

export function exitWineRouteDetail(router: BackRouter): void {
  goBackOr(router, WINE_ROUTES_ROUTE);
}
