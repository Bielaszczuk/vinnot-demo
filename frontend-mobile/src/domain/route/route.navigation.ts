import { hasCoordinates } from "@/domain/location/coordinates";
import type { RouteStop, WineRoute } from "./route.types";

function mapsQuery(stop: RouteStop): string {
  return hasCoordinates(stop.location)
    ? `${stop.location.latitude},${stop.location.longitude}`
    : stop.location.address || stop.name;
}

export function routeDirectionsUrl(stops: RouteStop[]): string | null {
  if (stops.length === 0) return null;
  const origin = encodeURIComponent(mapsQuery(stops[0]!));
  const destination = encodeURIComponent(mapsQuery(stops[stops.length - 1]!));
  const waypoints = stops.slice(1, -1).map(mapsQuery).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}&travelmode=driving`;
}

export function routeStopMapUrl(stop: RouteStop): string {
  return `https://maps.google.com/?q=${encodeURIComponent(mapsQuery(stop))}`;
}

export function routeDurationMinutes(route: WineRoute): number {
  const total = route.stops.reduce((sum, stop) => sum + (stop.duration || 0), 0);
  return total > 0 ? total : Math.max(0, route.duration);
}
