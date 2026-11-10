import { contrastRatio } from "./contrast";
import {
  adminSectionAccent,
  iconStrokes,
  lightTokens,
  neutral,
  profileTagColors,
  shadowColors,
  systemColors,
  tasteAttributeColors,
  wine,
  wineTypeColor,
  wineTypeColors,
} from "./tokens";
import { vinnotColors } from "./vinnotTheme";

describe("contrastRatio", () => {
  it("measures black on white as 21:1 and a colour on itself as 1:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ab214c", "#AB214C")).toBeCloseTo(1, 5);
  });

  it("is symmetric and reads three-digit hex", () => {
    expect(contrastRatio("#fff", "#ab214c")).toBeCloseTo(contrastRatio("#ab214c", "#ffffff"), 5);
  });
});

describe("one palette (S81)", () => {
  it("keeps tokens.ts as the source of wine-600", () => {
    expect(wine[600]).toBe("#cb2d5d");
  });

  it("uses the higher-contrast status values", () => {
    expect(systemColors.danger).toBe("#dc2626");
    expect(systemColors.success).toBe("#047857");
    expect(contrastRatio(systemColors.danger, neutral[0])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(systemColors.success, neutral[0])).toBeGreaterThanOrEqual(4.5);
  });

  it("has one pressed colour and one focus colour", () => {
    expect(lightTokens.brandPrimaryPressed).toBe(wine[800]);
    expect(vinnotColors.brandPressed).toBe(lightTokens.brandPrimaryPressed);
    expect(lightTokens.borderFocus).toBe(wine[700]);
    expect(vinnotColors.borderFocused).toBe(lightTokens.borderFocus);
  });

  it("derives every vinnotColors alias from tokens.ts", () => {
    const palette = new Set<string>([
      ...Object.values(wine),
      ...Object.values(neutral),
      ...Object.values(systemColors),
      ...Object.values(lightTokens),
    ]);
    for (const [name, value] of Object.entries(vinnotColors)) {
      expect({ name, inPalette: palette.has(value) }).toEqual({ name, inPalette: true });
    }
  });

  it("keeps the brand and the status aliases on the same values as the semantic tokens", () => {
    expect(vinnotColors.brand).toBe(lightTokens.brandPrimary);
    expect(vinnotColors.danger).toBe(lightTokens.danger);
    expect(vinnotColors.dangerSoft).toBe(lightTokens.dangerLight);
    expect(vinnotColors.success).toBe(lightTokens.success);
    expect(vinnotColors.successSoft).toBe(lightTokens.successLight);
    expect(vinnotColors.warningSoft).toBe(lightTokens.warningLight);
  });

  it("gives field error text AA contrast on white", () => {
    expect(contrastRatio(lightTokens.textDanger, neutral[0])).toBeGreaterThanOrEqual(4.5);
  });

  it("orders the icon strokes from thin to heavy", () => {
    expect(Object.values(iconStrokes)).toEqual([...Object.values(iconStrokes)].sort((a, b) => a - b));
  });

  it("tints shadows with neutral ink or the brand", () => {
    expect(shadowColors.soft).toBe(neutral[900]);
    expect(shadowColors.brand).toBe(wine[900]);
  });
});

describe("wine type, admin and taste accents (S83)", () => {
  it.each(Object.entries(wineTypeColors))("%s badge text passes AA on white and on its own tint", (_type, colors) => {
    expect(contrastRatio(colors.text, neutral[0])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.text, colors.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("covers every catalogue wine type", () => {
    expect(Object.keys(wineTypeColors).sort()).toEqual(
      ["DESSERT", "FORTIFIED", "ORANGE", "RED", "ROSE", "SPARKLING", "WHITE"],
    );
  });

  it("resolves a type in any case and falls back to the red badge", () => {
    expect(wineTypeColor("white")).toBe(wineTypeColors.WHITE);
    expect(wineTypeColor("UNKNOWN")).toBe(wineTypeColors.RED);
    expect(wineTypeColor(undefined)).toBe(wineTypeColors.RED);
  });

  it.each(Object.entries(adminSectionAccent))("the %s admin accent carries white text and reads on white", (_section, accent) => {
    expect(contrastRatio(accent, neutral[0])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(Object.entries(profileTagColors))("the %s profile tag text passes AA on its tint", (_family, colors) => {
    expect(contrastRatio(colors.text, colors.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(Object.entries(tasteAttributeColors))("the %s taste bar stands out from a white card", (_attribute, color) => {
    expect(contrastRatio(color, neutral[0])).toBeGreaterThanOrEqual(3);
  });
});
