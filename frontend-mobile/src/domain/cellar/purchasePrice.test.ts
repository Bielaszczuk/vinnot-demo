import { describe, expect, it } from "@jest/globals";
import { formatPurchasePriceInput, parsePurchasePrice } from "./purchasePrice";

describe("parsePurchasePrice", () => {
  it.each([
    ["12,50", 12.5],
    ["1.500", 1500],
    ["1.500,75", 1500.75],
    ["1500", 1500],
    ["1500,5", 1500.5],
    ["1.234.567,89", 1234567.89],
    [" 0 ", 0],
  ])("reads %s as %d in es-AR", (input, expected) => {
    expect(parsePurchasePrice(input, "es-AR")).toEqual({ ok: true, value: expected });
  });

  it.each([
    ["12.50", 12.5],
    ["1,500", 1500],
    ["1,500.75", 1500.75],
    ["1500", 1500],
  ])("reads %s as %d in en-US", (input, expected) => {
    expect(parsePurchasePrice(input, "en-US")).toEqual({ ok: true, value: expected });
  });

  it("treats an empty field as no price", () => {
    expect(parsePurchasePrice("  ", "es-AR")).toEqual({ ok: true, value: null });
  });

  it.each([
    ["12.5", "es-AR"],
    ["1.50", "es-AR"],
    ["12,5,0", "es-AR"],
    ["12,505", "es-AR"],
    ["abc", "es-AR"],
    ["-5", "es-AR"],
    ["1.5000", "es-AR"],
    ["12,50", "en-US"],
    ["1.500", "en-US"],
    ["1,5", "en-US"],
    ["$10", "en-US"],
  ])("rejects the invalid or ambiguous %s in %s", (input, locale) => {
    expect(parsePurchasePrice(input, locale)).toEqual({ ok: false });
  });
});

describe("formatPurchasePriceInput", () => {
  it("writes the stored price with the locale decimal separator", () => {
    expect(formatPurchasePriceInput(1500.5, "es-AR")).toBe("1500,5");
    expect(formatPurchasePriceInput(1500.5, "en-US")).toBe("1500.5");
    expect(formatPurchasePriceInput(12, "es-AR")).toBe("12");
  });

  it("leaves the field empty without a price", () => {
    expect(formatPurchasePriceInput(null, "es-AR")).toBe("");
    expect(formatPurchasePriceInput(undefined, "en-US")).toBe("");
    expect(formatPurchasePriceInput(Number.NaN, "en-US")).toBe("");
  });

  it("round-trips through the parser in both locales", () => {
    for (const locale of ["es-AR", "en-US"]) {
      const text = formatPurchasePriceInput(1234.56, locale);
      expect(parsePurchasePrice(text, locale)).toEqual({ ok: true, value: 1234.56 });
    }
  });
});
