import { describe, expect, it } from "@jest/globals";
import {
  VINTAGE_PICKER_OLDEST_YEAR,
  completeVintageQuery,
  filterVintageOptions,
  isValidVintage,
  vintageChange,
  vintageMatchesQuery,
  vintageOptions,
  vintageQueryDigits,
  vintageUpdateFields,
} from "./vintage";

const currentYear = 2026;

describe("vintage", () => {
  it("accepts vintages from 1800 up to next year only", () => {
    expect(isValidVintage(2018, currentYear)).toBe(true);
    expect(isValidVintage(1800, currentYear)).toBe(true);
    expect(isValidVintage(2027, currentYear)).toBe(true);
    expect(isValidVintage(1799, currentYear)).toBe(false);
    expect(isValidVintage(2028, currentYear)).toBe(false);
    expect(isValidVintage(2018.5, currentYear)).toBe(false);
    expect(isValidVintage(null, currentYear)).toBe(false);
  });

  it("offers the catalog vintage first, then every year from the current one down to 1900", () => {
    const options = vintageOptions({ suggestedYear: 2015, currentYear });

    expect(options.slice(0, 4)).toEqual([
      { year: 2015, suggested: true },
      { year: 2026, suggested: false },
      { year: 2025, suggested: false },
      { year: 2024, suggested: false },
    ]);
    expect(options.at(-1)).toEqual({ year: VINTAGE_PICKER_OLDEST_YEAR, suggested: false });
    expect(options).toHaveLength(currentYear - VINTAGE_PICKER_OLDEST_YEAR + 1);
    expect(options.filter((option) => option.year === 2015)).toHaveLength(1);
  });

  it("offers every year newest first when there is no catalog vintage", () => {
    const years = vintageOptions({ currentYear }).map((option) => option.year);

    expect(years.slice(0, 3)).toEqual([2026, 2025, 2024]);
    expect(years).toHaveLength(currentYear - VINTAGE_PICKER_OLDEST_YEAR + 1);
  });

  it("ignores a catalog vintage outside the picker range", () => {
    expect(vintageOptions({ suggestedYear: 1850, currentYear })[0]).toEqual({ year: 2026, suggested: false });
    expect(vintageOptions({ suggestedYear: 2027, currentYear })[0]).toEqual({ year: 2026, suggested: false });
    expect(vintageOptions({ suggestedYear: 2015.5, currentYear }).some((option) => option.suggested)).toBe(false);
  });

  it("keeps only the four digits a vintage query can hold", () => {
    expect(vintageQueryDigits("2016")).toBe("2016");
    expect(vintageQueryDigits(" 20a1-6 ")).toBe("2016");
    expect(vintageQueryDigits("201678")).toBe("2016");
    expect(vintageQueryDigits("año")).toBe("");
  });

  it("matches a year that starts with the typed digits", () => {
    expect(vintageMatchesQuery(2019, "")).toBe(true);
    expect(vintageMatchesQuery(2019, "2")).toBe(true);
    expect(vintageMatchesQuery(2019, "201")).toBe(true);
    expect(vintageMatchesQuery(2019, "2019")).toBe(true);
    expect(vintageMatchesQuery(2009, "201")).toBe(false);
    expect(vintageMatchesQuery(2019, "9")).toBe(false);
  });

  it("also matches the year ending in exactly two typed digits", () => {
    expect(vintageMatchesQuery(1998, "98")).toBe(true);
    expect(vintageMatchesQuery(2019, "19")).toBe(true);
    expect(vintageMatchesQuery(1919, "19")).toBe(true);
    expect(vintageMatchesQuery(1998, "8")).toBe(false);
    expect(vintageMatchesQuery(1998, "998")).toBe(false);
  });

  it("filters the offered years by the query, keeping their order and the suggested mark", () => {
    const options = vintageOptions({ suggestedYear: 2015, currentYear });

    expect(filterVintageOptions(options, "201").map((option) => option.year))
      .toEqual([2015, 2019, 2018, 2017, 2016, 2014, 2013, 2012, 2011, 2010]);
    expect(filterVintageOptions(options, "201")[0]).toEqual({ year: 2015, suggested: true });
    expect(filterVintageOptions(options, "98")).toEqual([{ year: 1998, suggested: false }]);
    expect(filterVintageOptions(options, "1850")).toEqual([]);
    expect(filterVintageOptions(options, "")).toEqual(options);
  });

  it("names the year of a complete query only while the picker offers it", () => {
    expect(completeVintageQuery("2016", currentYear)).toBe(2016);
    expect(completeVintageQuery("1900", currentYear)).toBe(1900);
    expect(completeVintageQuery(String(currentYear), currentYear)).toBe(currentYear);
    expect(completeVintageQuery("1899", currentYear)).toBeNull();
    expect(completeVintageQuery("2027", currentYear)).toBeNull();
    expect(completeVintageQuery("201", currentYear)).toBeNull();
    expect(completeVintageQuery("", currentYear)).toBeNull();
  });

  it("reports a vintage change only when the value differs", () => {
    expect(vintageChange(2018, 2018)).toBeUndefined();
    expect(vintageChange(null, null)).toBeUndefined();
    expect(vintageChange(null, 2019)).toBe(2019);
    expect(vintageChange(2018, 2020)).toBe(2020);
    expect(vintageChange(2018, null)).toBeNull();
  });

  it("maps a vintage change to the update request fields", () => {
    expect(vintageUpdateFields(2018)).toEqual({ vintage: 2018 });
    expect(vintageUpdateFields(null)).toEqual({ clearVintage: true });
    expect(vintageUpdateFields(undefined)).toEqual({});
  });
});
