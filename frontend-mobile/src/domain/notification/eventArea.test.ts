import { describe, expect, it } from "@jest/globals";
import {
  REGION_SEARCH_LIMIT,
  isEventAreaKind,
  isRegionQuery,
  isSelectedRegion,
  matchRegions,
  toApproximateCoordinate,
} from "./eventArea";

describe("event area", () => {
  it("knows only the region and approximate kinds", () => {
    expect(isEventAreaKind("REGION")).toBe(true);
    expect(isEventAreaKind("APPROXIMATE")).toBe(true);
    expect(isEventAreaKind("PRECISE")).toBe(false);
  });

  it("marks the region the user already chose", () => {
    const area = { kind: "REGION" as const, regionId: "r1", regionName: "Valle de Uco" };

    expect(isSelectedRegion(area, "r1")).toBe(true);
    expect(isSelectedRegion(area, "r2")).toBe(false);
    expect(isSelectedRegion({ kind: "APPROXIMATE" }, "r1")).toBe(false);
    expect(isSelectedRegion(null, "r1")).toBe(false);
  });
  it("rounds a coordinate to a tenth of a degree before it leaves the device", () => {
    expect(toApproximateCoordinate(-32.889458)).toBe(-32.9);
    expect(toApproximateCoordinate(-68.845839)).toBe(-68.8);
    expect(toApproximateCoordinate(0.04)).toBe(0);
  });

  describe("region search", () => {
    const region = (name: string, countryName = "Argentina") => ({ name, countryName });
    const catalog = [
      region("Luján de Cuyo"),
      region("Valle de Uco"),
      region("Cafayate"),
      region("Douro", "Portugal"),
      region("Uco Norte"),
    ];

    it("shows nothing until the query has two letters", () => {
      expect(matchRegions(catalog, "")).toEqual([]);
      expect(matchRegions(catalog, " u ")).toEqual([]);
      expect(isRegionQuery(" u ")).toBe(false);
      expect(isRegionQuery("uc")).toBe(true);
    });

    it("matches names ignoring case and accents, names that start with the query first", () => {
      expect(matchRegions(catalog, "UCO").map((item) => item.name)).toEqual(["Uco Norte", "Valle de Uco"]);
      expect(matchRegions(catalog, "lujan").map((item) => item.name)).toEqual(["Luján de Cuyo"]);
    });

    it("matches the country too", () => {
      expect(matchRegions(catalog, "portu").map((item) => item.name)).toEqual(["Douro"]);
    });

    it("returns at most the search limit", () => {
      const many = Array.from({ length: REGION_SEARCH_LIMIT + 3 }, (_, index) => region(`Valle ${index}`));
      expect(matchRegions(many, "valle")).toHaveLength(REGION_SEARCH_LIMIT);
    });
  });
});
