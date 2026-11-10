import { describe, expect, it } from "@jest/globals";
import { mapWineryFromDto, mapWinerySummaryFromDto } from "./winery.mappers";

describe("winery.mappers", () => {
  it("maps detail defaults without inventing optional identity", () => {
    const winery = mapWineryFromDto({ id: "winery-1", name: "Winery" });

    expect(winery).toMatchObject({
      id: "winery-1",
      name: "Winery",
      ratingsCount: 0,
      ratingsAverage: null,
      winesCount: 0,
      labelsCount: 0,
      isActive: true,
    });
    expect(winery.countryId).toBeNull();
    expect(winery.regionId).toBeNull();
  });

  it("preserves summary coordinates and presentation assets", () => {
    const winery = mapWinerySummaryFromDto({
      id: "winery-1",
      name: "Winery",
      latitude: -32.9,
      longitude: -68.8,
      logoUrl: "logo.jpg",
    });

    expect(winery).toMatchObject({
      latitude: -32.9,
      longitude: -68.8,
      logoUrl: "logo.jpg",
      address: null,
    });
  });
});
