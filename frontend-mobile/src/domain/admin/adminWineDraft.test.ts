import {
  adminWineSection,
  parseOptionalDecimal,
  toAdminWineDraft,
  toAdminWinePayload,
  validateAdminWineDraft,
  type AdminWineDraft,
} from "./adminWineDraft";

const valid = (patch: Partial<AdminWineDraft> = {}): AdminWineDraft => ({
  ...toAdminWineDraft(),
  name: "Malbec",
  wineryId: "w-1",
  wineryName: "Norte",
  ...patch,
});

describe("admin wine draft", () => {
  it("starts a new wine as an active red with nothing else", () => {
    expect(toAdminWineDraft()).toMatchObject({ wineType: "RED", isActive: true, isFeatured: false, vintage: null, grapes: [] });
  });

  it("accepts a complete wine", () => {
    expect(validateAdminWineDraft(valid({ alcoholContent: "13,5", priceMin: "10", priceMax: "10" }))).toEqual([]);
  });

  it("requires a name and a winery", () => {
    expect(validateAdminWineDraft(valid({ name: "  ", wineryId: "" }))).toEqual([
      { field: "name", code: "nameRequired" },
      { field: "wineryId", code: "wineryRequired" },
    ]);
  });

  it("mirrors the backend limits", () => {
    expect(
      validateAdminWineDraft(
        valid({
          name: "x".repeat(256),
          style: "s".repeat(101),
          grapes: Array.from({ length: 51 }, (_, index) => `g${index}`),
          alcoholContent: "101",
          priceMin: "-1",
          priceMax: "abc",
          imageUrl: "h".repeat(501),
        }),
      ).map((error) => error.code),
    ).toEqual(["nameTooLong", "styleTooLong", "tooManyGrapes", "alcoholInvalid", "priceInvalid", "priceInvalid", "imageUrlTooLong"]);
  });

  it("rejects a maximum price below the minimum", () => {
    expect(validateAdminWineDraft(valid({ priceMin: "30", priceMax: "20" }))).toEqual([{ field: "priceMax", code: "priceRange" }]);
  });

  it("assigns every field to its section", () => {
    expect(["name", "wineryId", "vintage", "grapes", "allergens", "descriptionEn", "imageUrl", "priceMax", "bodyScore"].map(adminWineSection))
      .toEqual(["general", "general", "general", "composition", "composition", "descriptions", "media", "media", "taste"]);
  });

  it("parses decimals typed with a comma and leaves blanks empty", () => {
    expect(parseOptionalDecimal(" 13,5 ")).toBe(13.5);
    expect(parseOptionalDecimal("")).toBeNull();
    expect(parseOptionalDecimal("x")).toBeNaN();
  });

  it("builds the request body with trimmed text and null blanks", () => {
    expect(toAdminWinePayload(valid({ name: " Malbec ", style: " ", alcoholContent: "x", priceMin: "1500" }))).toEqual({
      name: "Malbec",
      wineType: "RED",
      wineryId: "w-1",
      vintage: null,
      style: null,
      grapes: [],
      allergens: [],
      alcoholContent: null,
      descriptionEs: null,
      descriptionEn: null,
      imageUrl: null,
      priceMin: 1500,
      priceMax: null,
      isFeatured: false,
      isActive: true,
      acidityScore: null,
      tanninScore: null,
      bodyScore: null,
      sweetnessScore: null,
    });
  });
});
