import { normalizeCatalogName } from "@/domain/wine/catalogChoice";
import { contrastRatio } from "@/shared/theme/contrast";

export interface GrapeGradient {
  /** Left-to-right gradient stops, inspired by the colour of the wine in the glass. */
  colors: readonly [string, string];
  /** Label colour that stays readable on both stops. */
  textColor: string;
}

const LIGHT_TEXT = "#FFFFFF";
const DARK_TEXT = "#3B2A10";
/** WCAG AA minimum contrast for normal-size text. */
const WCAG_AA_TEXT_CONTRAST = 4.5;

/**
 * Gradient stops per grape, from the deepest hue of the wine to its rim.
 * Reds go from inky violet to ruby; whites from straw to gold.
 */
const GRAPE_STOPS: Record<string, readonly [string, string]> = {
  malbec: ["#2A0A3B", "#7E1A47"],
  "cabernet sauvignon": ["#1B0A2A", "#4A1850"],
  merlot: ["#5A1027", "#9E2338"],
  "pinot noir": ["#6E1530", "#B23A52"],
  syrah: ["#200C2C", "#572563"],
  chardonnay: ["#F6DE92", "#E4B654"],
  "sauvignon blanc": ["#F1F4CF", "#D3DC8F"],
  torrontes: ["#FCF2BF", "#EECF72"],
};

function readableText(colors: readonly [string, string]): string {
  const lightWorks = colors.every((stop) => contrastRatio(LIGHT_TEXT, stop) >= WCAG_AA_TEXT_CONTRAST);
  return lightWorks ? LIGHT_TEXT : DARK_TEXT;
}

/** Gradient for a grape pill, or null when the grape has no palette yet. */
export function grapeGradient(name: string): GrapeGradient | null {
  const colors = GRAPE_STOPS[normalizeCatalogName(name)];
  return colors ? { colors, textColor: readableText(colors) } : null;
}
