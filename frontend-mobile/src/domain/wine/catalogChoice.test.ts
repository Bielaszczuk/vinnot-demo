import {
  emptyChoice,
  filterCatalogOptions,
  findCatalogMatch,
  isKnownGrape,
  linkChoice,
  linkGrapes,
  normalizeCatalogName,
  splitGrapes,
} from "./catalogChoice";

const countries = [
  { id: "ar", name: "Argentina" },
  { id: "cl", name: "Chile" },
];

describe("catalog choices", () => {
  it("normalizes names ignoring case, accents and punctuation", () => {
    expect(normalizeCatalogName("  Mendozá, Luján ")).toBe("mendoza lujan");
    expect(normalizeCatalogName(null)).toBe("");
  });

  it("finds a catalog entry only when exactly one name matches", () => {
    expect(findCatalogMatch(countries, " ARGENTINA ")).toEqual({ id: "ar", name: "Argentina" });
    expect(findCatalogMatch(countries, "Narnia")).toBeNull();
    expect(findCatalogMatch(countries, "")).toBeNull();
    expect(findCatalogMatch([...countries, { id: "ar2", name: "argentina" }], "Argentina")).toBeNull();
  });

  it("links an unlinked choice to its catalog entry and keeps anything else", () => {
    expect(linkChoice({ id: null, name: "argentina" }, countries)).toEqual({ id: "ar", name: "Argentina" });
    expect(linkChoice({ id: null, name: "Narnia" }, countries)).toEqual({ id: null, name: "Narnia" });
    const picked = { id: "cl", name: "Chile" };
    expect(linkChoice(picked, countries)).toBe(picked);
    expect(linkChoice(emptyChoice, countries)).toBe(emptyChoice);
  });

  it("filters options by search ignoring accents, with a limit", () => {
    const regions = [
      { id: "1", name: "Luján de Cuyo" },
      { id: "2", name: "Valle de Uco" },
      { id: "3", name: "Lujan Norte" },
    ];
    expect(filterCatalogOptions(regions, "lujan").map((option) => option.id)).toEqual(["1", "3"]);
    expect(filterCatalogOptions(regions, "", 2).map((option) => option.id)).toEqual(["1", "2"]);
  });

  it("splits label grapes and links them to catalog names without duplicates", () => {
    const grapes = [
      { id: "m", name: "Malbec" },
      { id: "t", name: "Torrontes" },
    ];
    expect(splitGrapes(" malbec, Torrontés ,, Uva Criolla ")).toEqual(["malbec", "Torrontés", "Uva Criolla"]);
    expect(splitGrapes(null)).toEqual([]);
    expect(linkGrapes(["malbec", "Torrontés", "Malbec", "Uva Criolla"], grapes)).toEqual([
      "Malbec",
      "Torrontes",
      "Uva Criolla",
    ]);
    expect(isKnownGrape("TORRONTÉS", grapes)).toBe(true);
    expect(isKnownGrape("Uva Criolla", grapes)).toBe(false);
  });
});
