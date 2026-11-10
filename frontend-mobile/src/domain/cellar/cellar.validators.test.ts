import { describe, expect, it } from "@jest/globals";
import { addToCellarSchema, updateCellarEntrySchema } from "./cellar.validators";

describe("cellar.validators", () => {
  it("accepts valid optional cellar metadata", () => {
    expect(addToCellarSchema.safeParse({
      wineId: "wine-1",
      rating: 5,
      purchasePrice: 0,
      notes: null,
    }).success).toBe(true);
  });

  it("rejects missing wine identity and out-of-range values", () => {
    expect(addToCellarSchema.safeParse({ wineId: "" }).success).toBe(false);
    expect(updateCellarEntrySchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(updateCellarEntrySchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(updateCellarEntrySchema.safeParse({ purchasePrice: -1 }).success).toBe(false);
    expect(updateCellarEntrySchema.safeParse({ notes: "x".repeat(1001) }).success).toBe(false);
  });

  it("accepts a personal rating from 0.1 to 5.0 with one decimal", () => {
    expect(updateCellarEntrySchema.safeParse({ rating: 3.6 }).success).toBe(true);
    expect(addToCellarSchema.safeParse({ wineId: "wine-1", rating: 0.1 }).success).toBe(true);
    expect(updateCellarEntrySchema.safeParse({ rating: 3.65 }).success).toBe(false);
    expect(updateCellarEntrySchema.safeParse({ rating: 0.05 }).success).toBe(false);
    expect(updateCellarEntrySchema.safeParse({ rating: null }).success).toBe(true);
  });

  it("accepts an optional tasted vintage within the allowed range", () => {
    const nextYear = new Date().getFullYear() + 1;
    expect(addToCellarSchema.safeParse({ wineId: "wine-1", vintage: 2018 }).success).toBe(true);
    expect(addToCellarSchema.safeParse({ wineId: "wine-1", vintage: null }).success).toBe(true);
    expect(updateCellarEntrySchema.safeParse({ vintage: nextYear }).success).toBe(true);
    expect(updateCellarEntrySchema.safeParse({ vintage: 1799 }).success).toBe(false);
    expect(updateCellarEntrySchema.safeParse({ vintage: nextYear + 1 }).success).toBe(false);
    expect(updateCellarEntrySchema.safeParse({ vintage: 2018.5 }).success).toBe(false);
  });
});
