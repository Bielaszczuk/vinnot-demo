/**
 * Colours of the taste wheel, one view (one kind) at a time. Grapes take their colour from
 * their tone: reds, then rosés, then whites, then the rest, each group in its own family of
 * shades that alternate so neighbours never look alike. Styles take the app's wine-type
 * swatch; regions take eight distinct hues. Each colour is painted as watercolor on cream
 * paper: a light wash and a dark wash of it. Pure, so it is tested without rendering.
 */
import type { TasteSlice } from "@/domain/social/social.types";
import { tasteWheelPalette, wineTypeSwatches, type WineTypeColorKey } from "@/shared/theme/tokens";

export interface PaintedSlice {
  slice: TasteSlice;
  color: string;
}

type GrapeFamily = "red" | "rose" | "white" | "neutral";

/** Order of the grape groups round the wheel: rosé sits between reds and whites. */
const GRAPE_FAMILIES: readonly GrapeFamily[] = ["red", "rose", "white", "neutral"];

function toneKey(tone: string | null): string {
  return (tone ?? "").toUpperCase().replace("É", "E");
}

function grapeFamily(tone: string | null): GrapeFamily {
  switch (toneKey(tone)) {
    case "RED":
      return "red";
    case "ROSE":
      return "rose";
    case "WHITE":
      return "white";
    default:
      return "neutral";
  }
}

function styleColor(slice: TasteSlice): string {
  const key = toneKey(slice.tone ?? slice.value) as WineTypeColorKey;
  return wineTypeSwatches[key] ?? tasteWheelPalette.unknownStyle;
}

/**
 * Shades taken in turn from each entry's family. When the last entry would match the first
 * one it touches round the circle, it takes another shade of its family.
 */
function cycleShades(entries: TasteSlice[], families: (readonly string[])[]): PaintedSlice[] {
  const colors = entries.map((_, index) => {
    const family = families[index]!;
    const position = families.slice(0, index).filter((other) => other === family).length;
    return family[position % family.length]!;
  });
  const last = colors.length - 1;
  if (last > 0 && colors[last] === colors[0]) {
    const family = families[last]!;
    colors[last] = family.find((shade) => shade !== colors[0] && shade !== colors[last - 1])!;
  }
  return entries.map((slice, index) => ({ slice, color: colors[index]! }));
}

export function paintTasteSlices(slices: readonly TasteSlice[]): PaintedSlice[] {
  const kind = slices[0]?.kind;
  if (kind === undefined) return [];
  if (kind === "TYPE") return slices.map((slice) => ({ slice, color: styleColor(slice) }));
  if (kind === "REGION") return cycleShades([...slices], slices.map(() => tasteWheelPalette.regions));
  const ordered = GRAPE_FAMILIES.flatMap((family) => slices.filter((slice) => grapeFamily(slice.tone) === family));
  return cycleShades(
    ordered,
    ordered.map((slice) => tasteWheelPalette[grapeFamily(slice.tone)]),
  );
}

/** The cream paper the wheel is painted on. */
export const WASH_PAPER = "#FAF5EE";
const LIGHT_WASH_POWER = 0.6;
const DARK_WASH_POWER = 1.2;

const channels = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));

/** Pigment on paper: each paper channel times the colour's channel raised to `power`. */
export function washShade(color: string, power: number): string {
  const paper = channels(WASH_PAPER);
  const shade = channels(color).map((channel, index) => Math.round(paper[index]! * Math.pow(channel / 255, power)));
  return `#${shade.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export const lightWash = (color: string) => washShade(color, LIGHT_WASH_POWER);
export const darkWash = (color: string) => washShade(color, DARK_WASH_POWER);
