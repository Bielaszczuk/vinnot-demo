import { describe, expect, it } from "@jest/globals";
import {
  mapRouteStopFromDto,
  mapRouteWineryFromDto,
  mapWineRouteFromDto,
  mapWineRouteSummaryFromDto,
} from "./route.mappers";

describe("route.mappers", () => {
  it("preserves list stop counts without fabricating unloaded stops", () => {
    const route = mapWineRouteSummaryFromDto({ id: "r", name: "Route", stopCount: 3 });
    expect(route.stopCount).toBe(3);
    expect(route.stops).toEqual([]);
    expect(mapWineRouteSummaryFromDto({ id: "r", name: "Route" }).stopCount).toBe(0);
    expect(mapWineRouteFromDto({ id: "r", name: "Route", stopCount: 8, stops: [] }).stopCount).toBe(0);
  });

  it("maps summary defaults and publication status", () => {
    const route = mapWineRouteSummaryFromDto({
      id: "route-1",
      name: "Mendoza",
      estimatedDays: 2,
      status: "active",
    });

    // Days are not minutes, and a route without a length has no difficulty.
    expect(route.duration).toBe(0);
    expect(route.estimatedDays).toBe(2);
    expect(route.difficulty).toBeNull();
    expect(route.isPublished).toBe(true);
    expect(route.stops).toEqual([]);
  });

  it("keeps minutes, days and difficulty apart on details", () => {
    const route = mapWineRouteFromDto({
      id: "route-1",
      name: "Valle de Uco",
      estimatedDuration: 150,
      estimatedDays: 1,
      difficulty: "long",
    });

    expect(route).toMatchObject({ duration: 150, estimatedDays: 1, difficulty: "long" });
    expect(mapWineRouteFromDto({ id: "r", name: "R", difficulty: "extreme" }))
      .toMatchObject({ duration: 0, estimatedDays: null, difficulty: null });
    expect(mapWineRouteSummaryFromDto({ id: "r", name: "R", difficulty: "short", estimatedDuration: 45 }))
      .toMatchObject({ duration: 45, estimatedDays: null, difficulty: "short" });
  });

  it("associates winery stops by normalized name", () => {
    const route = mapWineRouteFromDto({
      id: "route-1",
      name: "Route",
      wineries: [{ id: "winery-1", name: "Bodega Uno", email: "mail@test.com" }],
      stops: [{ id: "stop-1", name: "bodega uno", type: "winery", stopOrder: 3 }],
      recommendedWineTypes: ["RED"],
    });

    expect(route.stops[0]?.winery).toMatchObject({ id: "winery-1", name: "Bodega Uno" });
    expect(route.tags).toEqual(["RED"]);
  });

  it("maps stop and winery nullable values", () => {
    expect(mapRouteStopFromDto({ id: "stop", name: "Stop" })).toMatchObject({
      order: 0,
      duration: 0,
      location: { address: "", latitude: null, longitude: null },
    });
    expect(mapRouteWineryFromDto({ id: "winery", name: "Winery" })).toMatchObject({
      wines: [], email: null, phone: null, website: null,
    });
  });
});
