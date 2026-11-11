import { describe, expect, it } from "@jest/globals";
import { LABEL_SCAN_TEXT_LIMITS } from "@/shared/image/wineLabelText";
import {
  mergeObservedLabelText,
  normalizeLabelBarcode,
  plausibleScannedVintage,
} from "./labelScan";

describe("mergeObservedLabelText", () => {
  it("merges front and back readings without repeating a line", () => {
    expect(mergeObservedLabelText(["CATENA", "MALBEC"], ["Malbec", "Bodega Catena Zapata"])).toEqual([
      "CATENA",
      "MALBEC",
      "Bodega Catena Zapata",
    ]);
  });

  it("keeps room for the back label when the front reading is already full", () => {
    const front = Array.from({ length: 24 }, (_, index) => `front ${index}`);
    const back = Array.from({ length: 24 }, (_, index) => `back ${index}`);
    const merged = mergeObservedLabelText(front, back);

    expect(merged).toHaveLength(LABEL_SCAN_TEXT_LIMITS.maxLines);
    expect(merged.filter((line) => line.startsWith("front"))).toHaveLength(12);
    expect(merged.filter((line) => line.startsWith("back"))).toHaveLength(12);
  });
});

describe("normalizeLabelBarcode", () => {
  it.each(["12345670", "036000291452", "7791234567898", "17791234567895"])(
    "accepts the EAN/UPC code %s",
    (code) => expect(normalizeLabelBarcode(` ${code} `)).toBe(code),
  );

  it.each(["", "1234567", "123456789", "779123456789012", "7791234A67890", "7791234567890", "https://x.y", null, 42])(
    "rejects %p",
    (value) => expect(normalizeLabelBarcode(value)).toBeNull(),
  );
});

describe("plausibleScannedVintage", () => {
  it("keeps a year the vintage picker can offer", () => {
    expect(plausibleScannedVintage(2019, 2026)).toBe(2019);
    expect(plausibleScannedVintage(1900, 2026)).toBe(1900);
    expect(plausibleScannedVintage(2026, 2026)).toBe(2026);
  });

  it.each([null, undefined, 1899, 2027, 2019.5, Number.NaN, "2019"])("drops %p", (value) => {
    expect(plausibleScannedVintage(value, 2026)).toBeNull();
  });
});
