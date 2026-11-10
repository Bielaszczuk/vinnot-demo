import type { WineColorIntensity, WineColorTone } from "@/domain/wine/wine.color-tone";
import strokeMask from "../../assets/images/wine-colors/stroke.webp";
import strokeLight from "../../assets/images/wine-colors/stroke-light.webp";
import strokeDense from "../../assets/images/wine-colors/stroke-dense.webp";

/** Watercolor pigment for each tone, tuned to read on the cream cards (same values as the web). */
export const WINE_TONE_COLORS: Record<WineColorTone, string> = {
  WHITE_GREEN: "#D6D886",
  WHITE_LEMON: "#E3D96C",
  WHITE_STRAW: "#E6CF74",
  WHITE_GOLD: "#DDAE43",
  WHITE_OLD_GOLD: "#C79A3C",
  AMBER: "#CC8234",
  MAHOGANY: "#6E3416",
  ROSE_PALE: "#ECB1A6",
  ROSE_SALMON: "#E2957A",
  ROSE_RASPBERRY: "#D2546C",
  ROSE_RASPBERRY_LIGHT: "#E3899A",
  RED_PURPLE: "#4E0D2C",
  RED_RUBY_LIGHT: "#A3243A",
  RED_CHERRY: "#9A1A24",
  RED_RUBY: "#7E1426",
  RED_RUBY_DEEP: "#4F0A18",
  RED_GARNET: "#7A2A1E",
  RED_TAWNY: "#8E4424",
  WHITE_WATER: "#E6E4BE",
  WHITE_STEEL: "#C9CFA2",
  WHITE_TOPAZ: "#D4943F",
  WHITE_BROWN: "#B07E36",
  ORANGE: "#E58B3F",
  AMBER_DARK: "#B2591C",
  ROSE_COPPER: "#DE9A5E",
  ROSE_CORAL: "#EE8A7A",
  ROSE_PEACH: "#F1BE96",
  ROSE_DEEP: "#B83A58",
  RED_INKY: "#2E0A26",
  RED_VIOLET_BRIGHT: "#7A1F6A",
  RED_PLUM: "#5E1638",
  RED_BRICK: "#9A3A26",
};

/**
 * The tone a reflection washes the stroke with: more saturated than the pigment, so a violet reflection
 * turns a deep ruby stroke purple, a garnet one turns a ruby stroke brick and a greenish one turns straw green (same values as the web).
 */
export const REFLECTION_GLINTS: Record<WineColorTone, string> = {
  WHITE_GREEN: "#9DBF3A",
  WHITE_LEMON: "#ECDD32",
  WHITE_STRAW: "#F2D35B",
  WHITE_GOLD: "#E8A920",
  WHITE_OLD_GOLD: "#C98F22",
  AMBER: "#E07B22",
  MAHOGANY: "#8A3A16",
  ROSE_PALE: "#F7B9AE",
  ROSE_SALMON: "#F58B66",
  ROSE_RASPBERRY: "#E8456E",
  ROSE_RASPBERRY_LIGHT: "#F07090",
  RED_PURPLE: "#8E3FA8",
  RED_RUBY_LIGHT: "#D0384F",
  RED_CHERRY: "#E02A34",
  RED_RUBY: "#D01848",
  RED_RUBY_DEEP: "#2A0610",
  RED_GARNET: "#B4482C",
  RED_TAWNY: "#C46A32",
  WHITE_WATER: "#D2DDB8",
  WHITE_STEEL: "#9FB1A6",
  WHITE_TOPAZ: "#E8962A",
  WHITE_BROWN: "#C08A2E",
  ORANGE: "#F5772B",
  AMBER_DARK: "#CC5F18",
  ROSE_COPPER: "#E98A3E",
  ROSE_CORAL: "#FA7462",
  ROSE_PEACH: "#F9B07C",
  ROSE_DEEP: "#D42A5A",
  RED_INKY: "#5A1E58",
  RED_VIOLET_BRIGHT: "#B04AC8",
  RED_PLUM: "#8A2A5C",
  RED_BRICK: "#BF5B3A",
};

/**
 * The grayscale brushstroke, as white masks whose alpha is the pigment coverage (all 720 x 208). The light and
 * dense masks are the same stroke with less or more pigment, so every wine keeps the one brush shape.
 */
export const WINE_STROKE_MASKS: Record<WineStroke, number> = {
  light: strokeLight,
  medium: strokeMask,
  dense: strokeDense,
};
export const WINE_COLOR_STROKE_RATIO = 720 / 208;

/** How loaded the brush is: watery for pale wines, loaded for deep ones. */
export type WineStroke = "light" | "medium" | "dense";

/** Tones that are pale or opaque by nature keep that look when the text names no depth. */
const PALE_TONES: ReadonlySet<WineColorTone> = new Set<WineColorTone>(["WHITE_WATER", "WHITE_STEEL", "WHITE_GREEN", "ROSE_PALE"]);
const DEEP_TONES: ReadonlySet<WineColorTone> = new Set<WineColorTone>(["RED_INKY", "RED_RUBY_DEEP", "MAHOGANY", "AMBER_DARK"]);

/** Picks the brush load from the depth the color line names, falling back to the tone's own look. */
export function strokeFor(tone: WineColorTone, intensity?: WineColorIntensity | null): WineStroke {
  if (intensity === "PALE") return "light";
  if (intensity === "DEEP") return "dense";
  if (intensity === "MEDIUM") return "medium";
  if (PALE_TONES.has(tone)) return "light";
  if (DEEP_TONES.has(tone)) return "dense";
  return "medium";
}

/** Mixes a hex color toward white; a rim the text leaves unnamed is the same wine, thinner at the edge. */
export function lighten(hex: string, amount: number): string {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `#${channels
    .map((value) => Math.round(value + (255 - value) * amount).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

/** Core color across the body of the stroke, turning into the rim color toward its tail. */
export function swatchColors(core: WineColorTone, rim?: WineColorTone | null): { core: string; rim: string } {
  const coreColor = WINE_TONE_COLORS[core];
  return { core: coreColor, rim: rim ? WINE_TONE_COLORS[rim] : lighten(coreColor, 0.35) };
}

/** How a reflection's wash meets the paint: it tints the hue, or it lightens the stroke with its tone. */
export type ReflectionBlend = "color" | "soft-light";

export interface ReflectionWash {
  color: string;
  blend: ReflectionBlend;
}

/** Violet, bright violet included, reads as the wine's own light when it brightens the stroke; tinting the hue makes it look like paint or a flashlight. */
const LIGHTENING_TONES: ReadonlySet<WineColorTone> = new Set<WineColorTone>(["RED_PURPLE", "RED_VIOLET_BRIGHT"]);

/**
 * The washes the stroke takes, one after another: every tone the color line names ("reflejos violáceos y
 * matices teja" -> violet, then tawny), or a lighter core when it names only brightness. Most tones tint the
 * paint's hue and keep its shading; violet and brightness lighten it with their tone.
 */
export function reflectionWashes(
  core: WineColorTone,
  reflections: readonly WineColorTone[] = [],
  highlights = false,
): ReflectionWash[] {
  if (reflections.length) {
    return reflections.map((tone) =>
      LIGHTENING_TONES.has(tone)
        ? { color: lighten(REFLECTION_GLINTS[tone], 0.3), blend: "soft-light" }
        : { color: REFLECTION_GLINTS[tone], blend: "color" },
    );
  }
  return highlights ? [{ color: lighten(REFLECTION_GLINTS[core], 0.45), blend: "soft-light" }] : [];
}
