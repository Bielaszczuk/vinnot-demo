import { describe, expect, it } from "vitest";
import { WINE_COLOR_TONES } from "@domain/wine/wine.color-tone";
import {
  lighten,
  reflectionWashes,
  REFLECTION_GLINTS,
  swatchColors,
  WINE_TONE_COLORS,
} from "./wineColorPalette";
import { strokeFor } from "./wineColorPalette";

describe("wineColorPalette", () => {
  it("has a pigment for every tone", () => {
    expect(Object.keys(WINE_TONE_COLORS).sort()).toEqual([...WINE_COLOR_TONES].sort());
    expect(Object.keys(REFLECTION_GLINTS).sort()).toEqual([...WINE_COLOR_TONES].sort());
  });

  it("washes each named reflection in its tone, lightening for violet and brightness and tinting otherwise", () => {
    expect(reflectionWashes("RED_RUBY_DEEP", ["RED_PURPLE", "RED_TAWNY"])).toEqual([
      { color: lighten("#8E3FA8", 0.3), blend: "soft-light" },
      { color: "#C46A32", blend: "color" },
    ]);
    expect(reflectionWashes("WHITE_STRAW", ["WHITE_GREEN"])).toEqual([{ color: "#9DBF3A", blend: "color" }]);
    expect(reflectionWashes("RED_RUBY_LIGHT", ["RED_GARNET"])).toEqual([{ color: "#B4482C", blend: "color" }]);
    expect(reflectionWashes("RED_RUBY", [], true)).toEqual([{ color: lighten("#D01848", 0.45), blend: "soft-light" }]);
    expect(reflectionWashes("RED_RUBY")).toEqual([]);
  });

  it("mixes a color toward white", () => {
    expect(lighten("#000000", 0.5)).toBe("#808080");
    expect(lighten("#7A2A1E", 0)).toBe("#7A2A1E");
  });

  it("uses the named rim, or a thinner core when there is none", () => {
    expect(swatchColors("RED_GARNET", "RED_TAWNY")).toEqual({ core: "#7A2A1E", rim: "#8E4424" });
    expect(swatchColors("RED_GARNET")).toEqual({ core: "#7A2A1E", rim: lighten("#7A2A1E", 0.35) });
  });
});

describe("strokeFor", () => {
  it("paints a pale wine with the watery stroke and a deep one with the loaded stroke", () => {
    expect(strokeFor("RED_PURPLE", "PALE")).toBe("light");
    expect(strokeFor("RED_PURPLE", "MEDIUM")).toBe("medium");
    expect(strokeFor("RED_PURPLE", "DEEP")).toBe("dense");
  });

  it("paints evolved wines by their depth too, with the same brush as every other wine", () => {
    for (const tone of ["RED_TAWNY", "RED_BRICK", "WHITE_TOPAZ", "WHITE_BROWN"] as const) {
      expect(strokeFor(tone, "PALE")).toBe("light");
      expect(strokeFor(tone, "DEEP")).toBe("dense");
      expect(strokeFor(tone, null)).toBe("medium");
    }
  });

  it("keeps the natural look of a tone when the text names no depth", () => {
    expect(strokeFor("WHITE_WATER", null)).toBe("light");
    expect(strokeFor("ROSE_PALE", undefined)).toBe("light");
    expect(strokeFor("RED_INKY", null)).toBe("dense");
    expect(strokeFor("MAHOGANY", null)).toBe("dense");
    expect(strokeFor("RED_RUBY", null)).toBe("medium");
  });
});

describe("bright violet reflections", () => {
  it("lighten the stroke with their tone instead of painting over it, like violet", () => {
    expect(reflectionWashes("RED_PURPLE", ["RED_VIOLET_BRIGHT"])).toEqual([
      { color: lighten("#B04AC8", 0.3), blend: "soft-light" },
    ]);
  });
});
