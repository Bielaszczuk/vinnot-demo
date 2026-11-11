import { COUNTRY_NAMES, localizeCountryName } from "./countryNames";

describe("localizeCountryName", () => {
  it("shows a stored Spanish country name in the UI language", () => {
    expect(localizeCountryName("Estados Unidos", "es-AR")).toBe("Estados Unidos");
    expect(localizeCountryName("Estados Unidos", "en-US")).toBe("United States");
    expect(localizeCountryName("Reino Unido", "en")).toBe("United Kingdom");
    expect(localizeCountryName("Argentina", "en-US")).toBe("Argentina");
  });

  it("matches the stored name ignoring case, accents and surrounding spaces", () => {
    expect(localizeCountryName("ESPAÑA", "en-US")).toBe("Spain");
    expect(localizeCountryName("  japon ", "en-US")).toBe("Japan");
    expect(localizeCountryName("islas virgenes de ee. uu.", "en-US")).toBe("U.S. Virgin Islands");
    expect(localizeCountryName("japon", "es-AR")).toBe("Japón");
  });

  it("matches English names and ISO codes too", () => {
    expect(localizeCountryName("Germany", "es-AR")).toBe("Alemania");
    expect(localizeCountryName("gb", "en-US")).toBe("United Kingdom");
  });

  it("maps the bad MG row to Madagascar", () => {
    expect(localizeCountryName("MG", "es-AR")).toBe("Madagascar");
    expect(localizeCountryName("MG", "en-US")).toBe("Madagascar");
  });

  it("falls back to the stored name when the country is unknown", () => {
    expect(localizeCountryName("Atlántida", "en-US")).toBe("Atlántida");
  });

  it("returns an empty string for empty or missing input", () => {
    expect(localizeCountryName("", "en-US")).toBe("");
    expect(localizeCountryName("   ", "en-US")).toBe("   ");
    expect(localizeCountryName(null, "en-US")).toBe("");
    expect(localizeCountryName(undefined)).toBe("");
  });

  it("defaults to Spanish when the language is missing", () => {
    expect(localizeCountryName("United States", null)).toBe("Estados Unidos");
  });

  it("covers every seeded country", () => {
    expect(Object.keys(COUNTRY_NAMES)).toHaveLength(116);
  });
});
