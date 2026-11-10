import { describe, expect, it } from "@jest/globals";
import { wineFilterSchema, wineReviewSchema, wineSubmissionSchema, parseAlcoholContent } from "./wine.validators";

describe("wine.validators", () => {
  it("enforces filter price, rating and vintage boundaries", () => {
    expect(wineFilterSchema.safeParse({ minPrice: 0, minRating: 5, vintage: 2020 }).success)
      .toBe(true);
    expect(wineFilterSchema.safeParse({ minPrice: -1 }).success).toBe(false);
    expect(wineFilterSchema.safeParse({ minRating: 6 }).success).toBe(false);
    expect(wineFilterSchema.safeParse({ vintage: 1799 }).success).toBe(false);
  });

  it("enforces review and tasting-note limits", () => {
    expect(wineReviewSchema.safeParse({ rating: 4, comment: "A valid tasting note" }).success)
      .toBe(true);
    expect(wineReviewSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(wineReviewSchema.safeParse({ rating: 0.1 }).success).toBe(true);
    expect(wineReviewSchema.safeParse({ rating: 3.6 }).success).toBe(true);
    expect(wineReviewSchema.safeParse({ rating: 3.65 }).success).toBe(false);
    expect(wineReviewSchema.safeParse({ rating: 5.1 }).success).toBe(false);
    expect(wineReviewSchema.safeParse({ rating: 4, comment: "short" }).success).toBe(false);
    expect(wineReviewSchema.safeParse({
      rating: 4,
      tastingNotes: { color: "x".repeat(201) },
    }).success).toBe(false);
  });

  it("requires submission identity and validates numeric optional text", () => {
    const valid = {
      wineName: "Malbec",
      wineryName: "Bodega",
      vintage: String(new Date().getFullYear()),
      alcoholContent: "14.5",
    };

    expect(wineSubmissionSchema.safeParse(valid).success).toBe(true);
    expect(wineSubmissionSchema.safeParse({ ...valid, wineName: " " }).success).toBe(false);
    expect(wineSubmissionSchema.safeParse({ ...valid, vintage: "1799" }).success).toBe(false);
    expect(wineSubmissionSchema.safeParse({ ...valid, alcoholContent: "101" }).success).toBe(false);
  });
});


it.each(["13,6", "13.6", " 13,6 ", "0", "100,00"])("accepts localized alcohol %s", (value) => {
  expect(wineSubmissionSchema.safeParse({ wineName: "Wine", wineryName: "Winery", alcoholContent: value }).success).toBe(true);
  expect(parseAlcoholContent(value)).toBe(Number(value.trim().replace(",", ".")));
});
it.each(["13,6,2", "13.6.2", "13,6.2", "101", "-1", "Infinity", "1e1", "13%"])("rejects invalid alcohol %s", (value) => {
  expect(wineSubmissionSchema.safeParse({ wineName: "Wine", wineryName: "Winery", alcoholContent: value }).success).toBe(false);
});

it("accepts catalog picks and up to ten grapes, like the backend", () => {
  const base = { wineName: "Wine", wineryName: "Winery" };
  const picked = { ...base, wineryId: "w", countryId: "c", regionId: "r", grapes: ["Malbec", "Uva Nueva"] };
  expect(wineSubmissionSchema.safeParse(picked).success).toBe(true);
  expect(wineSubmissionSchema.safeParse({ ...base, grapes: Array.from({ length: 11 }, (_, i) => `G${i}`) }).success).toBe(false);
  expect(wineSubmissionSchema.safeParse({ ...base, grapes: ["x".repeat(101)] }).success).toBe(false);
  expect(wineSubmissionSchema.safeParse({ ...base, grapes: [" "] }).success).toBe(false);
});
