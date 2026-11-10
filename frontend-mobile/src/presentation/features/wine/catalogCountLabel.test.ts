import { catalogCountLabel, PUBLIC_RESULT_WINDOW, wineListSubtitle } from "./catalogCountLabel";

const t = (key: string, options?: Record<string, unknown>) => `${key}|${JSON.stringify(options ?? {})}`;
const format = (value: number) => value.toLocaleString("es-AR");

describe("catalogCountLabel", () => {
  it("never shows the capped API total as the size of the whole catalog", () => {
    expect(catalogCountLabel({ total: PUBLIC_RESULT_WINDOW, filtered: false, t, format })).toBe(
      "wines.catalogCountMany|{}",
    );
  });

  it("shows the exact size of a catalog below the window", () => {
    expect(catalogCountLabel({ total: 87, filtered: false, t, format })).toBe(
      'wines.catalogCountExact|{"count":87,"formatted":"87"}',
    );
  });

  it("ties a country-only result to the country", () => {
    expect(
      catalogCountLabel({ total: 12, filtered: true, country: "Argentina", t, format }),
    ).toBe('wines.countInCountry|{"count":12,"formatted":"12","country":"Argentina"}');
  });

  it("reads a capped country result as a floor", () => {
    expect(
      catalogCountLabel({ total: 500, filtered: true, country: "Argentina", t, format }),
    ).toBe('wines.countInCountryMany|{"count":500,"formatted":"500","country":"Argentina"}');
  });

  it("calls any other filtered result a match count", () => {
    expect(catalogCountLabel({ total: 3, filtered: true, t, format })).toBe(
      'wines.matchingCount|{"count":3,"formatted":"3"}',
    );
    expect(catalogCountLabel({ total: 500, filtered: true, t, format })).toBe(
      'wines.matchingCountMany|{"count":500,"formatted":"500"}',
    );
  });
});

describe("wineListSubtitle", () => {
  const noFilters = { search: "", type: null, grape: "", country: "", region: "" };
  const ready = { isError: false, isLoading: false, hasData: true };

  it("says the list could not load when the first page failed", () => {
    expect(wineListSubtitle({ status: { ...ready, isError: true, hasData: false }, total: 0, filters: noFilters, t, format }))
      .toBe("wines.loadError|{}");
  });

  it("does not count zero wines while the first page is still loading", () => {
    expect(wineListSubtitle({ status: { ...ready, isLoading: true, hasData: false }, total: 0, filters: noFilters, t, format }))
      .toBe("wines.searching|{}");
  });

  it("ties a country-only result to the country", () => {
    expect(wineListSubtitle({ status: ready, total: 12, filters: { ...noFilters, country: "Argentina" }, t, format }))
      .toBe('wines.countInCountry|{"count":12,"formatted":"12","country":"Argentina"}');
  });

  it("counts matches without naming the country when other filters also apply", () => {
    expect(wineListSubtitle({ status: ready, total: 3, filters: { ...noFilters, country: "Argentina", type: "RED" }, t, format }))
      .toBe('wines.matchingCount|{"count":3,"formatted":"3"}');
  });

  it("treats a search as a filter", () => {
    expect(wineListSubtitle({ status: ready, total: 4, filters: { ...noFilters, search: " malbec " }, t, format }))
      .toBe('wines.matchingCount|{"count":4,"formatted":"4"}');
  });

  it("keeps the last count while a later page refreshes", () => {
    expect(wineListSubtitle({ status: { ...ready, isLoading: true }, total: 87, filters: noFilters, t, format }))
      .toBe('wines.catalogCountExact|{"count":87,"formatted":"87"}');
  });
});
