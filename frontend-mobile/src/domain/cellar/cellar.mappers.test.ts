import { describe, expect, it } from "@jest/globals";
import { mapCellarApiWineToInfo, mapCellarEntryFromDto } from "./cellar.mappers";

describe("cellar.mappers", () => {
  it("normalizes API wine fields and numeric ratings", () => {
    const wine = mapCellarApiWineToInfo({
      id: "wine-1",
      name: "Malbec",
      wineryName: "Winery",
      wineType: "RED",
      ratingAverage: "4.25",
      priceMin: 100,
    });

    expect(wine).toMatchObject({
      id: "wine-1",
      name: "Malbec",
      winery: "Winery",
      type: "RED",
      rating: 4.25,
      price: 100,
    });
  });

  it("maps nullable cellar fields and materializes the added date", () => {
    const entry = mapCellarEntryFromDto({
      id: "entry-1",
      wine: null,
      addedAt: "2026-08-10T12:00:00.000Z",
    });

    expect(entry.rating).toBeNull();
    expect(entry.purchasePrice).toBeNull();
    expect(entry.notes).toBeNull();
    expect(entry.vintage).toBeNull();
    expect(entry.wine.id).toBe("");
    expect(entry.addedAt).toEqual(new Date("2026-08-10T12:00:00.000Z"));
  });
  it("preserves the existing review identity without exposing private notes as a review", () => {
    const dto = { id: "entry", addedAt: "2026-10-08T12:00:00Z", notes: "Private note", reviewId: "own-review" };
    expect(mapCellarEntryFromDto(dto).reviewId).toBe("own-review");
    expect(mapCellarEntryFromDto({ ...dto, reviewId: null }).reviewId).toBeNull();
    expect(mapCellarEntryFromDto({ id: "entry", addedAt: dto.addedAt }).reviewId).toBeNull();
  });
  it("keeps the tasted vintage apart from the catalog vintage", () => {
    const entry = mapCellarEntryFromDto({
      id: "entry-1",
      wine: { id: "wine-1", vintage: 2020 },
      vintage: 2018,
      addedAt: "2026-08-10T12:00:00.000Z",
    });

    expect(entry.vintage).toBe(2018);
    expect(entry.wine.vintage).toBe(2020);
  });
});
