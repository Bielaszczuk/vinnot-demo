import type { CellarEntry } from "./cellar.types";
import { summarizeCellar } from "./cellar.stats";

function entry(id: string, type: string, region: string, rating: number | null, price: number | null = null): CellarEntry {
  return {
    id,
    wine: {
      id: `wine-${id}`,
      name: id,
      winery: "Winery",
      wineryId: null,
      type,
      vintage: null,
      imageUrl: null,
      region,
      country: "Argentina",
      price: null,
      rating: null,
    },
    rating,
    purchasePrice: price,
    notes: null,
    vintage: null,
    addedAt: new Date("2026-10-01T00:00:00Z"),
  };
}

describe("summarizeCellar", () => {
  it("counts wines, averages only rated entries and counts distinct regions", () => {
    const summary = summarizeCellar([
      entry("a", "RED", "Mendoza", 4),
      entry("b", "RED", " mendoza ", 5),
      entry("c", "WHITE", "Salta", null),
      entry("d", "ROSE", "", 0),
    ]);

    expect(summary.wineCount).toBe(4);
    expect(summary.averageRating).toBe(4.5);
    expect(summary.regionCount).toBe(2);
  });

  it("orders the wine-type mix from the most to the least common", () => {
    const summary = summarizeCellar([
      entry("a", "WHITE", "Salta", null),
      entry("b", "RED", "Mendoza", null),
      entry("c", "red", "Mendoza", null),
    ]);

    expect(summary.typeMix).toEqual([
      { type: "RED", count: 2 },
      { type: "WHITE", count: 1 },
    ]);
  });

  it("ignores the purchase price, which stays private", () => {
    const summary = summarizeCellar([entry("a", "RED", "Mendoza", 4, 25000)]);
    expect(Object.keys(summary)).not.toContain("totalInvested");
  });

  it("returns an empty summary for an empty cellar", () => {
    expect(summarizeCellar([])).toEqual({ wineCount: 0, averageRating: null, regionCount: 0, typeMix: [] });
  });
});
