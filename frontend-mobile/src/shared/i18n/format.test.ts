import { formatDate, formatDateTime, formatNumber, formatPrice, formatRating, formatTime } from "./format";

const date = new Date(2026, 9, 2, 15, 30);
const spaces = (value: string) => value.replace(/\s/g, " ");

describe("formatDate", () => {
  it("follows the app language, not a hardcoded locale", () => {
    expect(formatDate(date, "es-AR")).toBe("02 de oct de 2026");
    expect(formatDate(date, "en-US")).toBe("Oct 02, 2026");
  });

  it("maps any Spanish or English tag to the supported locale and defaults to Spanish", () => {
    expect(formatDate(date, "en")).toBe(formatDate(date, "en-US"));
    expect(formatDate(date, "es")).toBe(formatDate(date, "es-AR"));
    expect(formatDate(date, undefined)).toBe(formatDate(date, "es-AR"));
  });

  it("accepts ISO strings, keeps an unreadable string as it is and renders nothing for no value", () => {
    expect(formatDate("2026-10-02T15:30:00", "en-US")).toBe("Oct 02, 2026");
    expect(formatDate("soon", "en-US")).toBe("soon");
    expect(formatDate(null, "en-US")).toBe("");
    expect(formatDate(undefined, "en-US")).toBe("");
  });

  it("takes custom Intl options", () => {
    expect(formatDate(date, "en-US", { month: "short" })).toBe("Oct");
  });
});

describe("formatTime and formatDateTime", () => {
  it("use the app language", () => {
    expect(spaces(formatTime(date, "en-US"))).toBe("03:30 PM");
    expect(spaces(formatDateTime(date, "en-US"))).toBe("Oct 2, 2026, 3:30 PM");
    expect(spaces(formatDateTime(date, "es-AR"))).toBe("2 oct 2026, 3:30 p. m.");
    expect(formatTime(null, "en-US")).toBe("");
  });
});

describe("formatPrice", () => {
  it("formats an amount in its currency for the app language", () => {
    expect(spaces(formatPrice(1500, "ARS", "es-AR"))).toBe("$ 1.500,00");
    expect(spaces(formatPrice(1500, "ARS", "en-US"))).toBe("ARS 1,500.00");
  });

  it("defaults to pesos, can drop the cents and renders nothing for no amount", () => {
    expect(spaces(formatPrice(1500.4, undefined, "es-AR", { maximumFractionDigits: 0 }))).toBe("$ 1.500");
    expect(formatPrice(null, "ARS", "es-AR")).toBe("");
    expect(formatPrice(Number.NaN, "ARS", "es-AR")).toBe("");
  });
});

describe("formatNumber", () => {
  it("groups digits for the app language", () => {
    expect(formatNumber(12345, "es-AR")).toBe("12.345");
    expect(formatNumber(12345, "en-US")).toBe("12,345");
  });
});

describe("formatRating", () => {
  it("shows one decimal with the app language separator", () => {
    expect(formatRating(4, "es-AR")).toBe("4,0");
    expect(formatRating(4.25, "es-AR")).toBe("4,3");
    expect(formatRating(4, "en-US")).toBe("4.0");
  });
});
