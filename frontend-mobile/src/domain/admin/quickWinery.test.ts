import { toQuickWineryPayload, validateQuickWinery } from "./quickWinery";

describe("quick winery", () => {
  it("needs a name and a country", () => {
    expect(validateQuickWinery({ name: " ", countryId: "", regionId: "" })).toEqual([
      { field: "name", code: "nameRequired" },
      { field: "countryId", code: "countryRequired" },
    ]);
    expect(validateQuickWinery({ name: "x".repeat(256), countryId: "ar", regionId: "" })).toEqual([
      { field: "name", code: "nameTooLong" },
    ]);
    expect(validateQuickWinery({ name: "Norte", countryId: "ar", regionId: "" })).toEqual([]);
  });

  it("sends the region only when one was chosen", () => {
    expect(toQuickWineryPayload({ name: " Norte ", countryId: "ar", regionId: "" })).toEqual({ name: "Norte", countryId: "ar", regionId: null });
    expect(toQuickWineryPayload({ name: "Norte", countryId: "ar", regionId: "mza" })).toMatchObject({ regionId: "mza" });
  });
});
