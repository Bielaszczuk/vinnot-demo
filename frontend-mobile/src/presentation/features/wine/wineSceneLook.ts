import type { WineType } from "@/domain/wine/wine.types";

/** Glass shape drawn for a wine. */
export type SceneGlass = "bordeaux" | "rose" | "tulip" | "flute";
/** Colour of the wine in the glass and in the bottle. */
export type SceneWine = "red" | "ruby" | "rose" | "white" | "amber" | "sparkling";
/** Bottle opened in the first profile step. */
export type SceneBottle = "dark" | "clear" | "sparkling";

/** How the loading scenes draw one wine. */
export interface WineSceneLook {
  glass: SceneGlass;
  wine: SceneWine;
  bottle: SceneBottle;
  grapes: "red" | "white";
}

const RED: WineSceneLook = { glass: "bordeaux", wine: "red", bottle: "dark", grapes: "red" };

const LOOKS: Record<WineType, WineSceneLook> = {
  red: RED,
  fortified: { glass: "bordeaux", wine: "ruby", bottle: "dark", grapes: "red" },
  rose: { glass: "rose", wine: "rose", bottle: "clear", grapes: "red" },
  white: { glass: "tulip", wine: "white", bottle: "clear", grapes: "white" },
  orange: { glass: "tulip", wine: "amber", bottle: "clear", grapes: "white" },
  dessert: { glass: "tulip", wine: "amber", bottle: "clear", grapes: "white" },
  sparkling: { glass: "flute", wine: "sparkling", bottle: "sparkling", grapes: "white" },
};

/** The look of a wine in the loading scenes; a red wine until its type is known. */
export function wineSceneLook(type?: WineType | null): WineSceneLook {
  return (type && LOOKS[type]) || RED;
}

/** Colour of the stream poured into the glass. */
export const POUR_COLORS: Record<SceneWine, string> = {
  red: "#7A1F2E",
  ruby: "#8E2A36",
  rose: "#E39A8E",
  white: "#E3CF7C",
  amber: "#D08A3A",
  sparkling: "#E8C860",
};

/** Bottle that pours in the rating control: the scene bottle, tinted like its wine when clear. */
export type RatingBottle = "dark" | "clear-white" | "clear-rose" | "clear-amber" | "sparkling";

const CLEAR_BOTTLES: Partial<Record<SceneWine, RatingBottle>> = {
  rose: "clear-rose",
  white: "clear-white",
  amber: "clear-amber",
};

/** The rating bottle for a wine look (red and fortified pour from the dark bottle). */
export function pourBottle(look: WineSceneLook): RatingBottle {
  if (look.bottle !== "clear") return look.bottle;
  return CLEAR_BOTTLES[look.wine] ?? "clear-white";
}

/** The two wines a scene can draw: the profiled wine, or both wines of a comparison. */
export interface WineSceneLooks {
  first: WineSceneLook;
  second: WineSceneLook;
}

/** Looks for one wine (drawn twice when a scene needs two) or for the two wines of a comparison. */
export function wineSceneLooks(first?: WineType | null, second: WineType | null | undefined = first): WineSceneLooks {
  return { first: wineSceneLook(first), second: wineSceneLook(second) };
}
