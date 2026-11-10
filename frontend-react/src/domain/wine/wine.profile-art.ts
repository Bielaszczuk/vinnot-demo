/**
 * Illustrations of an AI profile, named by the backend from the profile text (computed on read, never stored).
 * Each set lists the backend taxonomy keys; the asset of a key is its kebab-case name.
 */

/** Aroma and flavor notes, in the backend's matching priority order. */
export const NOTE_ARTS = [
  "DRIED_FRUIT",
  "GREEN_APPLE",
  "HONEYSUCKLE",
  "WHITE_FLOWERS",
  "CHAMOMILE",
  "ROASTED_PEPPER",
  "RED_PEPPER",
  "GREEN_PEPPER",
  "DRIED_HERBS",
  "TOMATO_LEAF",
  "DRIED_LEAF",
  "BAY_LEAF",
  "SWEET_SPICE",
  "RASPBERRY",
  "STRAWBERRY",
  "BLACK_CHERRY",
  "CHERRY",
  "BLACKBERRY",
  "GOOSEBERRY",
  "BLACKCURRANT",
  "RED_CURRANT",
  "BLUEBERRY",
  "PLUM",
  "FIG",
  "BERGAMOT",
  "LIME",
  "LEMON",
  "ORANGE",
  "GRAPEFRUIT",
  "APPLE",
  "PEAR",
  "APRICOT",
  "PEACH",
  "QUINCE",
  "PASSION_FRUIT",
  "PINEAPPLE",
  "LYCHEE",
  "RED_GRAPE",
  "GRAPE",
  "WHITE_MELON",
  "MELON",
  "POMEGRANATE",
  "ROSE",
  "VIOLET",
  "FRESH_HERBS",
  "TEA",
  "GINGER",
  "ANISE",
  "WHITE_PEPPER",
  "BLACK_PEPPER",
  "WET_EARTH",
  "BLACK_OLIVE",
  "MINERAL",
  "LEATHER",
  "TOBACCO",
  "VANILLA",
  "COFFEE",
  "CHOCOLATE",
  "OAK",
  "HONEY",
  "CARAMEL",
  "MOLASSES",
  "BREAD",
  "NUTS",
  "BUTTER",
  "SALINE",
  "JAM",
  "SMOKE",
  "MIXED_FRUIT",
] as const;

/** Dishes of the food pairings. */
export const DISH_ARTS = [
  "PATE",
  "PIZZA",
  "MEAT_PIE",
  "OMELETTE",
  "BREADED_CUTLET",
  "EMPANADAS",
  "SEAFOOD_RICE",
  "RISOTTO",
  "CURRY",
  "SAVORY_TART",
  "FLAN",
  "NUT_TART",
  "COUSCOUS",
  "FRUIT_TART",
  "PASTA",
  "BISCOTTI",
  "GOAT_CHEESE",
  "CHEESE",
  "BEEF",
  "LAMB",
  "PORK",
  "POULTRY",
  "DUCK",
  "GAME",
  "FISH",
  "SEAFOOD",
  "CHARCUTERIE",
  "SALAD",
  "GREEN_VEGETABLES",
  "VEGETABLES",
  "MUSHROOMS",
  "OLIVES",
  "LEGUMES",
  "STEW",
  "DESSERT",
] as const;

/** The recommended glass. */
export const GLASS_ARTS = ["FLUTE", "SPARKLING_TULIP", "RED_BALLOON", "BORDEAUX", "WHITE_TULIP", "WHITE_BOWL", "ROSE", "DESSERT", "UNIVERSAL"] as const;

/**
 * Serving art the client shows on its own: the decanter when decanting is advised, an uncorked bottle when it is
 * not, the cellar with an aging text.
 */
export const SERVING_EXTRA_ARTS = ["DECANTER", "OPEN_BOTTLE", "CELLAR"] as const;

export type NoteArt = (typeof NOTE_ARTS)[number];
export type DishArt = (typeof DISH_ARTS)[number];
export type GlassArt = (typeof GLASS_ARTS)[number];
export type ServingExtraArt = (typeof SERVING_EXTRA_ARTS)[number];

/** One illustrated descriptor: the profile's own wording and the art that depicts it. */
export interface ArtItem<K extends string> {
  label: string;
  art: K;
}

export interface ServingTemperature {
  min: number;
  max: number;
}

export interface ServingArt {
  glass: GlassArt | null;
  decant: boolean;
  temperature: ServingTemperature | null;
}

export interface ProfileArt {
  aromas: ArtItem<NoteArt>[];
  flavors: ArtItem<NoteArt>[];
  pairings: ArtItem<DishArt>[];
  serving: ServingArt | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toItems<K extends string>(raw: unknown, keys: readonly K[]): ArtItem<K>[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!isRecord(item) || typeof item.label !== "string" || !item.label.trim()) return [];
    const art = keys.find((key) => key === item.art);
    return art ? [{ label: item.label, art }] : [];
  });
}

function toTemperature(raw: unknown): ServingTemperature | null {
  if (!isRecord(raw) || !Number.isFinite(raw.min) || !Number.isFinite(raw.max)) return null;
  const [min, max] = [raw.min as number, raw.max as number];
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

function toServing(raw: unknown): ServingArt | null {
  if (!isRecord(raw)) return null;
  return {
    glass: GLASS_ARTS.find((glass) => glass === raw.glass) ?? null,
    decant: raw.decant === true,
    temperature: toTemperature(raw.temperature),
  };
}

/** Unknown keys and malformed items show no art rather than a wrong one; a missing profile art is null. */
export function toProfileArt(raw: unknown): ProfileArt | null {
  if (!isRecord(raw)) return null;
  return {
    aromas: toItems(raw.aromas, NOTE_ARTS),
    flavors: toItems(raw.flavors, NOTE_ARTS),
    pairings: toItems(raw.pairings, DISH_ARTS),
    serving: toServing(raw.serving),
  };
}
