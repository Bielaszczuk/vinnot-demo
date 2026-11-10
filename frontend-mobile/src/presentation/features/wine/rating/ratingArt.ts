/**
 * Watercolor rating art (S8): glass, wine layer and bottle per wine look,
 * with the geometry measured on each 360 px high image.
 */

/** A bundled image module id, usable by both React Native Image and Skia useImage. */
export type RatingArtSource = number;
import glassBordeauxArt from "../../../../../assets/images/rating/glass-bordeaux.webp";
import glassRoseArt from "../../../../../assets/images/rating/glass-rose.webp";
import glassTulipArt from "../../../../../assets/images/rating/glass-tulip.webp";
import glassFluteArt from "../../../../../assets/images/rating/glass-flute.webp";
import wineRedArt from "../../../../../assets/images/rating/wine-red.webp";
import wineRubyArt from "../../../../../assets/images/rating/wine-ruby.webp";
import wineRoseArt from "../../../../../assets/images/rating/wine-rose.webp";
import wineWhiteArt from "../../../../../assets/images/rating/wine-white.webp";
import wineAmberArt from "../../../../../assets/images/rating/wine-amber.webp";
import wineSparklingArt from "../../../../../assets/images/rating/wine-sparkling.webp";
import bottleDarkArt from "../../../../../assets/images/rating/bottle-dark.webp";
import bottleClearWhiteArt from "../../../../../assets/images/rating/bottle-clear-white.webp";
import bottleClearRoseArt from "../../../../../assets/images/rating/bottle-clear-rose.webp";
import bottleClearAmberArt from "../../../../../assets/images/rating/bottle-clear-amber.webp";
import bottleSparklingArt from "../../../../../assets/images/rating/bottle-sparkling.webp";
import bottleDarkEmptyArt from "../../../../../assets/images/rating/bottle-dark-empty.webp";
import bottleClearWhiteEmptyArt from "../../../../../assets/images/rating/bottle-clear-white-empty.webp";
import bottleClearRoseEmptyArt from "../../../../../assets/images/rating/bottle-clear-rose-empty.webp";
import bottleClearAmberEmptyArt from "../../../../../assets/images/rating/bottle-clear-amber-empty.webp";
import bottleSparklingEmptyArt from "../../../../../assets/images/rating/bottle-sparkling-empty.webp";
import corkArt from "../../../../../assets/images/loading/cork.webp";
import corkSparklingArt from "../../../../../assets/images/loading/cork-sparkling.webp";
import corkscrewArt from "../../../../../assets/images/loading/corkscrew.webp";
import cageArt from "../../../../../assets/images/loading/cage.webp";
import wispArt from "../../../../../assets/images/loading/wisp-2.webp";
import type { WineType } from "@/domain/wine/wine.types";
import {
  POUR_COLORS,
  pourBottle,
  wineSceneLook,
  type RatingBottle,
  type SceneGlass,
  type SceneWine,
} from "../wineSceneLook";

/** [x, y, width, height] as fractions of the image; wine is uncovered from the bottom of the box up. */
export type WineBox = readonly [number, number, number, number];

export interface GlassArt {
  source: RatingArtSource;
  width: number;
  height: number;
  box: WineBox;
}

export interface CorkArt {
  source: RatingArtSource;
  width: number;
  height: number;
  /** Cork width as a fraction of the bottle width. */
  size: number;
  /** Share of the cork height that sits inside the neck. */
  inNeck: number;
  /** How it comes out, as in the AI profile scene. */
  kind: "still" | "sparkling";
}

export interface BottleArt {
  source: RatingArtSource;
  width: number;
  height: number;
  /** Centre of the bottle mouth in image pixels. */
  lip: readonly [number, number];
  cork: CorkArt;
  /** The same bottle with no wine left: same size, label and neck, so the two can be cut at the wine level. */
  empty: RatingArtSource;
  /** Where the wine sits when the bottle is full, as fractions of its height: shoulder and base. */
  wine: readonly [number, number];
}

/** A plain watercolor layer: source and pixel size. */
export interface SceneArt {
  source: RatingArtSource;
  width: number;
  height: number;
}

/** Props of the uncorking from the AI profile scene: the corkscrew for still wine, the cage for sparkling. */
export const UNCORK_ART = {
  corkscrew: { source: corkscrewArt, width: 224, height: 273 },
  cage: { source: cageArt, width: 135, height: 149 },
  wisp: { source: wispArt, width: 45, height: 150 },
} satisfies Record<string, SceneArt>;

const STILL_CORK: CorkArt = { source: corkArt, width: 76, height: 172, size: 0.26, inNeck: 0.5, kind: "still" };
const SPARKLING_CORK: CorkArt = { source: corkSparklingArt, width: 113, height: 160, size: 0.42, inNeck: 0.3, kind: "sparkling" };

export const GLASS_ART: Record<SceneGlass, GlassArt> = {
  bordeaux: { source: glassBordeauxArt, width: 177, height: 360, box: [0.027, 0.2009, 0.9459, 0.2939] },
  rose: { source: glassRoseArt, width: 172, height: 360, box: [0.0279, 0.1967, 0.9443, 0.2885] },
  tulip: { source: glassTulipArt, width: 148, height: 360, box: [0.0289, 0.2128, 0.9386, 0.2872] },
  flute: { source: glassFluteArt, width: 122, height: 360, box: [0.1261, 0.1512, 0.7478, 0.3774] },
};

/**
 * Filled part of the slider bar under the glasses: from the wine's deepest hue to its rim,
 * like the grape pills on the home screen.
 */
export const TRACK_GRADIENTS: Record<SceneWine, readonly [string, string]> = {
  red: ["#2A0A3B", "#7E1A47"],
  ruby: ["#5A1027", "#9E2338"],
  rose: ["#C9606B", "#F0B0A4"],
  white: ["#F6DE92", "#E4B654"],
  amber: ["#9A5A1E", "#D9A04F"],
  sparkling: ["#F3E3A0", "#E2C25A"],
};

/** Each wine layer shares the canvas of its glass. */
export const WINE_ART: Record<SceneWine, RatingArtSource> = {
  red: wineRedArt,
  ruby: wineRubyArt,
  rose: wineRoseArt,
  white: wineWhiteArt,
  amber: wineAmberArt,
  sparkling: wineSparklingArt,
};

export const BOTTLE_ART: Record<RatingBottle, BottleArt> = {
  dark: {
    source: bottleDarkArt, empty: bottleDarkEmptyArt, width: 104, height: 360, lip: [51.7, 3.6], cork: STILL_CORK,
    wine: [0.3, 0.97],
  },
  "clear-white": {
    source: bottleClearWhiteArt, empty: bottleClearWhiteEmptyArt, width: 105, height: 360, lip: [52.2, 3.6],
    cork: STILL_CORK, wine: [0.28, 0.97],
  },
  "clear-rose": {
    source: bottleClearRoseArt, empty: bottleClearRoseEmptyArt, width: 105, height: 360, lip: [51.9, 3.6],
    cork: STILL_CORK, wine: [0.28, 0.97],
  },
  "clear-amber": {
    source: bottleClearAmberArt, empty: bottleClearAmberEmptyArt, width: 106, height: 360, lip: [52.3, 3.6],
    cork: STILL_CORK, wine: [0.28, 0.97],
  },
  sparkling: {
    source: bottleSparklingArt, empty: bottleSparklingEmptyArt, width: 116, height: 360, lip: [55.7, 3.6],
    cork: SPARKLING_CORK, wine: [0.35, 0.97],
  },
};

export interface RatingArt {
  glassShape: SceneGlass;
  glass: GlassArt;
  wine: RatingArtSource;
  bottle: BottleArt;
  pourColor: string;
  /** Left-to-right gradient of the slider bar's filled part. */
  trackGradient: readonly [string, string];
  /** Sparkling wine shows rising bubbles in filled glasses. */
  bubbles: boolean;
}

/** Art for a wine type, through the same look table as the AI profile scene. */
export function ratingArt(type?: WineType | null): RatingArt {
  const look = wineSceneLook(type);
  return {
    glassShape: look.glass,
    glass: GLASS_ART[look.glass],
    wine: WINE_ART[look.wine],
    bottle: BOTTLE_ART[pourBottle(look)],
    pourColor: POUR_COLORS[look.wine],
    trackGradient: TRACK_GRADIENTS[look.wine],
    bubbles: look.glass === "flute",
  };
}

/** Top edge of the wine, as a fraction of the image height, for a glass filled by `fill` (0..1). */
export function wineTop(box: WineBox, fill: number): number {
  "worklet";
  const [, y, , h] = box;
  return y + h * (1 - Math.min(1, Math.max(0, fill)));
}
