import type { AdminRoute, AdminRouteStop } from "./admin.types";
import {
  adminRouteSection,
  emptyManualStop,
  normalizeStops,
  reorderStops,
  routeStopsDuration,
  toAdminRouteDraft,
  toAdminRoutePayload,
  toManualRouteStop,
  validateAdminRouteDraft,
  validateManualStop,
} from "./adminRouteDraft";

const stop = (name: string, stopOrder: number, estimatedDuration = 30): AdminRouteStop => ({
  name,
  description: "",
  type: "winery",
  address: "",
  latitude: null,
  longitude: null,
  stopOrder,
  estimatedDuration,
});

const route: AdminRoute = {
  id: "route-1",
  name: " Ruta del Valle ",
  description: "Bodegas de altura",
  country: "Argentina",
  region: "Mendoza",
  subregion: null,
  estimatedDuration: 240,
  estimatedDays: 2,
  totalDistance: 120.5,
  difficulty: "long",
  imageUrl: null,
  mapEmbedUrl: null,
  status: "active",
  recommendedWineTypes: ["RED"],
  createdAt: "2026-05-30T10:00:00.000Z",
};

describe("route draft", () => {
  it("starts a new route as a medium-length draft", () => {
    expect(toAdminRouteDraft()).toMatchObject({ name: "", status: "draft", difficulty: "medium", recommendedWineTypes: [] });
  });

  it("requires a name and a country", () => {
    expect(validateAdminRouteDraft(toAdminRouteDraft())).toEqual([
      { field: "name", code: "nameRequired" },
      { field: "country", code: "countryRequired" },
    ]);
  });

  it("rejects what the backend would reject", () => {
    const draft = {
      ...toAdminRouteDraft(route),
      name: "n".repeat(256),
      description: "d".repeat(20001),
      subregion: "s".repeat(101),
      estimatedDays: "0",
      totalDistance: "-1",
      mapEmbedUrl: "m".repeat(1001),
    };
    expect(validateAdminRouteDraft(draft).map((error) => error.code)).toEqual([
      "nameTooLong",
      "descriptionTooLong",
      "subregionTooLong",
      "daysInvalid",
      "distanceInvalid",
      "mapEmbedUrlTooLong",
    ]);
  });

  it("accepts a decimal distance typed with a comma", () => {
    const draft = { ...toAdminRouteDraft(route), totalDistance: "12,5" };
    expect(validateAdminRouteDraft(draft)).toEqual([]);
    expect(toAdminRoutePayload(draft, []).totalDistance).toBe(12.5);
  });

  it("maps every field to its form section", () => {
    expect(adminRouteSection("name")).toBe("details");
    expect(adminRouteSection("country")).toBe("location");
    expect(adminRouteSection("subregion")).toBe("location");
    expect(adminRouteSection("mapEmbedUrl")).toBe("media");
    expect(adminRouteSection("imageUrl")).toBe("media");
  });

  it("builds the payload, with the stops' total time when there are stops", () => {
    const stops = [stop("Norte", 1, 60), stop("Mirador", 2, 30)];
    expect(toAdminRoutePayload(toAdminRouteDraft(route), stops)).toEqual({
      name: "Ruta del Valle",
      description: "Bodegas de altura",
      country: "Argentina",
      region: "Mendoza",
      subregion: null,
      estimatedDuration: 90,
      estimatedDays: 2,
      totalDistance: 120.5,
      difficulty: "long",
      imageUrl: null,
      mapEmbedUrl: null,
      status: "active",
      recommendedWineTypes: ["RED"],
      stops,
    });
    expect(toAdminRoutePayload(toAdminRouteDraft(route), []).estimatedDuration).toBe(240);
  });
});

describe("stops", () => {
  it("sorts stops by their order and renumbers them after a change", () => {
    expect(normalizeStops([stop("B", 2), stop("A", 1)]).map((item) => item.name)).toEqual(["A", "B"]);
    expect(reorderStops([stop("B", 5), stop("A", 9)]).map((item) => item.stopOrder)).toEqual([1, 2]);
    expect(routeStopsDuration([stop("A", 1, 45), stop("B", 2, 15)])).toBe(60);
  });

  it("validates a manual stop and turns it into a stop with 30 minutes by default", () => {
    expect(validateManualStop(emptyManualStop())).toEqual([{ field: "name", code: "stopNameRequired" }]);
    expect(validateManualStop({ ...emptyManualStop(), name: "Mirador", estimatedDuration: "0" })).toEqual([
      { field: "estimatedDuration", code: "stopDurationInvalid" },
    ]);
    expect(validateManualStop({ ...emptyManualStop(), name: "n".repeat(256), address: "a".repeat(501) })).toEqual([
      { field: "name", code: "stopNameTooLong" },
      { field: "address", code: "stopAddressTooLong" },
    ]);
    expect(
      toManualRouteStop({ ...emptyManualStop(), name: " Mirador ", type: "viewpoint", estimatedDuration: "" }, 3),
    ).toEqual({
      name: "Mirador",
      description: "",
      type: "viewpoint",
      address: "",
      latitude: null,
      longitude: null,
      stopOrder: 3,
      estimatedDuration: 30,
    });
  });
});
