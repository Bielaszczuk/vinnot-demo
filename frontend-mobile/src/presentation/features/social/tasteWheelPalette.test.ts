import { describe, expect, it } from "@jest/globals";
import type { TasteSlice } from "@/domain/social/social.types";
import { tasteWheelPalette, wineTypeSwatches } from "@/shared/theme/tokens";
import { WASH_PAPER, darkWash, lightWash, paintTasteSlices, washShade } from "./tasteWheelPalette";

const slice = (kind: TasteSlice["kind"], value: string, tone: string | null = null): TasteSlice => ({
  kind,
  value,
  label: value,
  score: 4,
  tone,
  ratedWines: 2,
});

/** Each colour differs from the next one around the wheel, the last one touching the first. */
function neighboursDiffer(colors: string[]): boolean {
  if (colors.length < 2) return true;
  return colors.every((color, index) => color !== colors[(index + 1) % colors.length]);
}

describe("taste wheel palette", () => {
  it("groups grapes by tone, reds then rosés then whites then the rest, keeping the order sent inside a group", () => {
    const painted = paintTasteSlices([
      slice("GRAPE", "chardonnay", "WHITE"),
      slice("GRAPE", "malbec", "RED"),
      slice("GRAPE", "grenache", "ROSE"),
      slice("GRAPE", "syrah", "RED"),
      slice("GRAPE", "unknown", null),
      slice("GRAPE", "torrontes", "WHITE"),
      slice("GRAPE", "moscatel", "DESSERT"),
    ]);
    expect(painted.map((entry) => entry.slice.value)).toEqual([
      "malbec",
      "syrah",
      "grenache",
      "chardonnay",
      "torrontes",
      "unknown",
      "moscatel",
    ]);
    expect(painted.map((entry) => entry.color)).toEqual([
      tasteWheelPalette.red[0],
      tasteWheelPalette.red[1],
      tasteWheelPalette.rose[0],
      tasteWheelPalette.white[0],
      tasteWheelPalette.white[1],
      tasteWheelPalette.neutral[0],
      tasteWheelPalette.neutral[1],
    ]);
  });

  it("uses the same hex values as the web wheel", () => {
    expect(tasteWheelPalette.red).toEqual(["#7A1F3D", "#B8304A", "#6B3F8F", "#9A4A7C"]);
    expect(tasteWheelPalette.white).toEqual(["#D4A537", "#B7C25A", "#E9D47F"]);
    expect(tasteWheelPalette.rose).toEqual(["#E58FA6", "#D3637E", "#F2B5BC"]);
    expect(tasteWheelPalette.neutral).toEqual(["#A99A8C", "#8C7F76", "#CDBDA9"]);
    expect(tasteWheelPalette.unknownStyle).toBe("#A59B93");
    expect(tasteWheelPalette.regions).toEqual([
      "#C8664A",
      "#D9A441",
      "#8A9A4B",
      "#3F8C8A",
      "#4F6FA8",
      "#8C6BB1",
      "#C95D85",
      "#8B5A3C",
    ]);
    expect(wineTypeSwatches).toEqual({
      RED: "#7A1D3E",
      WHITE: "#E4C766",
      ROSE: "#EE9AAE",
      SPARKLING: "#B9C98A",
      DESSERT: "#C9853A",
      FORTIFIED: "#6E2F22",
      ORANGE: "#E08A3C",
    });
  });

  it("gives red, white, rosé and other grapes shades from their own family", () => {
    const families = [tasteWheelPalette.red, tasteWheelPalette.white, tasteWheelPalette.rose, tasteWheelPalette.neutral];
    const all = families.flat();
    // No shade is shared between two families.
    expect(new Set(all).size).toBe(all.length);
    expect(tasteWheelPalette.red.length).toBeGreaterThanOrEqual(4);
    for (const family of families) expect(family.length).toBeGreaterThanOrEqual(3);
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])("never paints two neighbouring grapes alike with %p red grapes", (count) => {
    const painted = paintTasteSlices(Array.from({ length: count }, (_, index) => slice("GRAPE", `red-${index}`, "RED")));
    expect(painted).toHaveLength(count);
    expect(neighboursDiffer(painted.map((entry) => entry.color))).toBe(true);
    for (const entry of painted) expect(tasteWheelPalette.red).toContain(entry.color);
  });

  it("keeps neighbours apart when the last group wraps round to the first", () => {
    const painted = paintTasteSlices([
      slice("GRAPE", "a", "WHITE"),
      slice("GRAPE", "b", "WHITE"),
      slice("GRAPE", "c", "WHITE"),
      slice("GRAPE", "d", "WHITE"),
    ]);
    expect(neighboursDiffer(painted.map((entry) => entry.color))).toBe(true);
  });

  it("paints each wine style with the app's wine-type swatch, unknown styles in a neutral shade", () => {
    const painted = paintTasteSlices([slice("TYPE", "RED", "RED"), slice("TYPE", "WHITE", null), slice("TYPE", "AMBER", "AMBER")]);
    expect(painted.map((entry) => entry.slice.value)).toEqual(["RED", "WHITE", "AMBER"]);
    expect(painted[0]!.color).toBe(wineTypeSwatches.RED);
    expect(painted[1]!.color).toBe(wineTypeSwatches.WHITE);
    expect(painted[2]!.color).toBe(tasteWheelPalette.unknownStyle);
  });

  it("paints up to eight regions in eight distinct hues, in the order sent", () => {
    const regions = Array.from({ length: 8 }, (_, index) => slice("REGION", `region-${index}`));
    const painted = paintTasteSlices(regions);
    expect(painted.map((entry) => entry.slice.value)).toEqual(regions.map((region) => region.value));
    expect(new Set(painted.map((entry) => entry.color)).size).toBe(8);
    expect(painted.map((entry) => entry.color)).toEqual([...tasteWheelPalette.regions]);
  });

  it("still keeps neighbours apart past eight regions", () => {
    const painted = paintTasteSlices(Array.from({ length: 9 }, (_, index) => slice("REGION", `region-${index}`)));
    expect(neighboursDiffer(painted.map((entry) => entry.color))).toBe(true);
  });

  it("paints nothing for an empty view", () => {
    expect(paintTasteSlices([])).toEqual([]);
  });
});

describe("watercolor wash shades", () => {
  it("paints on the app's cream paper", () => {
    expect(WASH_PAPER).toBe("#FAF5EE");
  });

  it("multiplies the paper by each channel raised to the wash power", () => {
    expect(washShade("#7A1F3D", 0.6)).toBe("#A14565");
    expect(washShade("#7A1F3D", 1.2)).toBe("#67142B");
    expect(washShade("#d4a537", 0.6)).toBe("#E0BD5F");
  });

  it("gives a light wash at power 0.6 and a dark wash at power 1.2", () => {
    expect(lightWash("#D4A537")).toBe("#E0BD5F");
    expect(darkWash("#D4A537")).toBe("#C89126");
  });

  it("leaves white as the paper and black as black", () => {
    expect(lightWash("#FFFFFF")).toBe(WASH_PAPER);
    expect(darkWash("#FFFFFF")).toBe(WASH_PAPER);
    expect(lightWash("#000000")).toBe("#000000");
  });
});
