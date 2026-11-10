import { contrastRatio } from "@/shared/theme/contrast";
import { grapeGradient } from "./grapeColors";

const POPULAR = [
  "Malbec",
  "Cabernet Sauvignon",
  "Merlot",
  "Pinot Noir",
  "Chardonnay",
  "Sauvignon Blanc",
  "Torrontés",
  "Syrah",
];

describe("grapeGradient", () => {
  it.each(POPULAR)("gives %s its own two-stop gradient", (grape) => {
    const gradient = grapeGradient(grape);
    expect(gradient).not.toBeNull();
    expect(gradient?.colors).toHaveLength(2);
  });

  it.each(POPULAR)("keeps the %s label readable on both stops (WCAG AA)", (grape) => {
    const gradient = grapeGradient(grape)!;
    for (const stop of gradient.colors) {
      expect(contrastRatio(gradient.textColor, stop)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("puts white text on the dark red grapes", () => {
    expect(grapeGradient("Malbec")?.textColor).toBe("#FFFFFF");
    expect(grapeGradient("Cabernet Sauvignon")?.textColor).toBe("#FFFFFF");
  });

  it("puts dark text on the pale white grapes", () => {
    expect(grapeGradient("Torrontés")?.textColor).not.toBe("#FFFFFF");
  });

  it("matches names regardless of case and accents", () => {
    expect(grapeGradient("torrontes")).toEqual(grapeGradient("Torrontés"));
    expect(grapeGradient("MALBEC")).toEqual(grapeGradient("Malbec"));
  });

  it("returns null for a grape without a palette", () => {
    expect(grapeGradient("Unknown grape")).toBeNull();
  });
});
