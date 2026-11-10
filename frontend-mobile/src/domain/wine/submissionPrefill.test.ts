import { withFallbackWineName } from "./submissionPrefill";
import type { ExtractedLabelData } from "./wine.types";

const label: ExtractedLabelData = {
  wineryName: "Bodega Norte",
  wineName: null,
  grapeVariety: "Malbec",
  vintage: 2022,
  wineType: "RED",
  region: "Mendoza",
  country: "Argentina",
  alcoholContent: "14%",
  confidence: 0.6,
  searchKeywords: null,
  visualDescription: null,
};

describe("withFallbackWineName", () => {
  it("keeps the name read from the label", () => {
    const read = { ...label, wineName: "Reserva" };
    expect(withFallbackWineName(read, "Malbec Norte")).toBe(read);
  });

  it("fills a missing label name with the searched text and keeps the other label data", () => {
    expect(withFallbackWineName(label, "Malbec Norte")).toEqual({ ...label, wineName: "Malbec Norte" });
  });

  it("builds empty label data around the searched text when nothing was scanned", () => {
    expect(withFallbackWineName(null, "Malbec Norte")).toEqual({
      wineryName: null,
      wineName: "Malbec Norte",
      grapeVariety: null,
      vintage: null,
      wineType: null,
      region: null,
      country: null,
      alcoholContent: null,
      confidence: 0,
      searchKeywords: null,
      visualDescription: null,
    });
  });

  it("returns the scan unchanged when nothing was searched", () => {
    expect(withFallbackWineName(label, null)).toBe(label);
    expect(withFallbackWineName(null, null)).toBeNull();
  });
});
