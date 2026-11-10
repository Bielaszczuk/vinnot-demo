import type { RouteStop } from "@/domain/route/route.types";
import { routeDirectionsUrl, routeStopMapUrl } from "@/domain/route/route.navigation";
import { externalLinkGateway } from "@/infrastructure/device/externalLink.gateway";

async function open(url: string | null): Promise<boolean> {
  if (!url) return false;
  try {
    await externalLinkGateway.open(url);
    return true;
  } catch {
    return false;
  }
}

export const routeNavigationService = {
  openRoute: (stops: RouteStop[]) => open(routeDirectionsUrl(stops)),
  openStop: (stop: RouteStop) => open(routeStopMapUrl(stop)),
};
