import { routeDirectionsUrl, routeDurationMinutes, routeStopMapUrl } from "./route.navigation";
import type { RouteStop, WineRoute } from "./route.types";
const stop = (
  name: string,
  latitude: number | null = null,
  longitude: number | null = null,
): RouteStop => ({
  id: name,
  order: 0,
  name,
  type: "winery",
  description: "",
  location: { latitude, longitude, address: "", city: "" },
  duration: 30,
  winery: null,
});
it("keeps directions ordered, encodes addresses and accepts zero coordinates", () => {
  const stops = [
    stop("first", 0, 0),
    {
      ...stop("middle"),
      location: { ...stop("middle").location, address: "RP71, Trevelin & Chubut" },
    },
    stop("last", -43, -71),
  ];
  const url = new URL(routeDirectionsUrl(stops)!);
  expect(url.searchParams.get("origin")).toBe("0,0");
  expect(url.searchParams.get("destination")).toBe("-43,-71");
  expect(url.searchParams.get("waypoints")).toBe("RP71, Trevelin & Chubut");
  expect(url.searchParams.get("travelmode")).toBe("driving");
});
it("handles no stops, one stop, and invalid coordinates without inventing a location", () => {
  expect(routeDirectionsUrl([])).toBeNull();
  const url = new URL(routeDirectionsUrl([stop("Viñas del Nant y Fall", 999, 0)])!);
  expect(url.searchParams.get("origin")).toBe("Viñas del Nant y Fall");
  expect(url.searchParams.has("waypoints")).toBe(false);
  expect(new URL(routeStopMapUrl(stop("zero", 0, 0))).searchParams.get("q")).toBe("0,0");
  expect(new URL(routeStopMapUrl(stop("By name"))).searchParams.get("q")).toBe("By name");
});
it("keeps minute units when there are no stop durations, matching the API contract", () => {
  const route = { stops: [], duration: 240 } as unknown as WineRoute;
  expect(routeDurationMinutes(route)).toBe(240);
  expect(routeDurationMinutes({ ...route, stops: [stop("a"), stop("b")] })).toBe(60);
  expect(routeDurationMinutes({ ...route, duration: -1 })).toBe(0);
  expect(routeDurationMinutes({ ...route, stops: [{ ...stop("a"), duration: 0 }] })).toBe(240);
});
