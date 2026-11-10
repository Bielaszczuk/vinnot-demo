import { describe, it, expect } from "vitest";
import { wineQuickInfo } from "./wine.quick-info";
import type { Wine } from "./wine.types";

describe("wine quick information projection", () => {
  const overview = { summary: "Fruta roja, frescura y taninos suaves.", acidityScore: 60,
    tanninScore: 35, bodyScore: 55, sweetnessScore: 5, foodPairings: ["Cordero"] };
  const wine = { id: "wine", description: "", acidityScore: null, tanninScore: null,
    bodyScore: null, sweetnessScore: null, foodPairing: null,
    profileOverview: { es: overview, en: { ...overview, summary: "Red fruit and freshness.", foodPairings: ["Lamb"] } } } as Wine;

  it("shows a saved profile without mutating catalog data", () => {
    expect(wineQuickInfo(wine, "es-AR")).toMatchObject({ description: overview.summary,
      acidityScore: 60, tanninScore: 35, bodyScore: 55, sweetnessScore: 5, foodPairing: "Cordero" });
    expect(wine.description).toBe("");
    expect(wine.bodyScore).toBeNull();
  });
  it("selects the requested language and preserves known/manual values including zero", () => {
    expect(wineQuickInfo(wine, "en-US")?.description).toBe("Red fruit and freshness.");
    const manual = { ...wine, description: "Manual", acidityScore: 0, foodPairing: "Pasta" };
    expect(wineQuickInfo(manual, "en")).toMatchObject({ description: "Manual", acidityScore: 0, foodPairing: "Pasta" });
    expect(wineQuickInfo({ ...wine, catalogDescriptions: { es: "Catálogo", en: "Catalog" } }, "en")?.description).toBe("Catalog");
    expect(wineQuickInfo({ ...wine, description: "Catálogo", catalogDescriptions: { es: "Catálogo" } }, "en")?.description).toBe("Red fruit and freshness.");
  });
  it("does not invent data or use the wrong profile language", () => {
    expect(wineQuickInfo(undefined, "es")).toBeUndefined();
    expect(wineQuickInfo({ ...wine, profileOverview: undefined }, "es")).toMatchObject({ description: "", bodyScore: null, foodPairing: null });
    expect(wineQuickInfo({ ...wine, profileOverview: { es: overview } }, "en")?.description).toBe("");
    expect(wineQuickInfo({ ...wine, profileOverview: { es: { ...overview, summary: null, bodyScore: null, foodPairings: [] } } }, "es"))
      .toMatchObject({ description: "", bodyScore: null, foodPairing: null });
  });
});
