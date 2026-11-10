import { describe, expect, it } from "vitest";
import { WINE_COLOR_INTENSITIES, WINE_COLOR_TONES, toWineColorIntensity, toWineColorTone } from "./wine.color-tone";

describe("toWineColorTone", () => {
  it("keeps every tone the backend names", () => {
    for (const tone of WINE_COLOR_TONES) expect(toWineColorTone(tone)).toBe(tone);
  });

  it("drops unknown, missing and differently cased tones", () => {
    for (const raw of [undefined, null, "", "red_ruby", "BLUE", 3]) expect(toWineColorTone(raw)).toBeNull();
  });
});

describe("terroir and age tones", () => {
  it("knows the finer hues the backend names since profile-v12", () => {
    for (const tone of ["WHITE_WATER", "WHITE_STEEL", "WHITE_TOPAZ", "WHITE_BROWN", "ORANGE", "AMBER_DARK",
      "ROSE_COPPER", "ROSE_CORAL", "ROSE_PEACH", "ROSE_DEEP", "RED_INKY", "RED_VIOLET_BRIGHT", "RED_PLUM",
      "RED_BRICK"]) expect(toWineColorTone(tone)).toBe(tone);
  });
});

describe("toWineColorIntensity", () => {
  it("keeps every intensity the backend names", () => {
    for (const intensity of WINE_COLOR_INTENSITIES) expect(toWineColorIntensity(intensity)).toBe(intensity);
  });

  it("drops unknown, missing and differently cased intensities", () => {
    for (const raw of [undefined, null, "", "deep", "VERY_DEEP", 2]) expect(toWineColorIntensity(raw)).toBeNull();
  });
});
