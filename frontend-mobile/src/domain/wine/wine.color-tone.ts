/** A tone of a profile's visual color line, named by the backend: the main hue and, when described, the rim. */
export const WINE_COLOR_TONES = [
  "WHITE_GREEN",
  "WHITE_LEMON",
  "WHITE_STRAW",
  "WHITE_GOLD",
  "WHITE_OLD_GOLD",
  "AMBER",
  "MAHOGANY",
  "ROSE_PALE",
  "ROSE_SALMON",
  "ROSE_RASPBERRY",
  "ROSE_RASPBERRY_LIGHT",
  "RED_PURPLE",
  "RED_RUBY_LIGHT",
  "RED_CHERRY",
  "RED_RUBY",
  "RED_RUBY_DEEP",
  "RED_GARNET",
  "RED_TAWNY",
  "WHITE_WATER",
  "WHITE_STEEL",
  "WHITE_TOPAZ",
  "WHITE_BROWN",
  "ORANGE",
  "AMBER_DARK",
  "ROSE_COPPER",
  "ROSE_CORAL",
  "ROSE_PEACH",
  "ROSE_DEEP",
  "RED_INKY",
  "RED_VIOLET_BRIGHT",
  "RED_PLUM",
  "RED_BRICK",
] as const;

export type WineColorTone = (typeof WINE_COLOR_TONES)[number];

/** Unknown or missing tones show no swatch rather than a wrong one. */
export function toWineColorTone(raw: unknown): WineColorTone | null {
  return WINE_COLOR_TONES.find((tone) => tone === raw) ?? null;
}

/** The reflection tones of a color line, in order; unknown tones are dropped. */
export function toWineColorTones(raw: unknown): WineColorTone[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const tone = toWineColorTone(item);
    return tone ? [tone] : [];
  });
}

/** How deep the core of the color line reads, named by the backend; null when the line names no depth. */
export const WINE_COLOR_INTENSITIES = ["PALE", "MEDIUM", "DEEP"] as const;

export type WineColorIntensity = (typeof WINE_COLOR_INTENSITIES)[number];

/** Unknown or missing intensities read as none, so the swatch keeps its base stroke. */
export function toWineColorIntensity(raw: unknown): WineColorIntensity | null {
  return WINE_COLOR_INTENSITIES.find((intensity) => intensity === raw) ?? null;
}
