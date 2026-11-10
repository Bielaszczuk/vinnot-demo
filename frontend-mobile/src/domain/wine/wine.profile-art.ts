/**
 * Illustrations for the AI profile sections, named by the backend (`profileArt`, computed on read).
 * @contract: keep in sync with frontend-react and the backend classifiers (SensoryNote, PairingDish, ServingArt).
 */

/** Aroma and flavor notes, in the backend's matching priority order. */
export const NOTE_ART_KEYS = [
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

/** Food pairing dishes. */
export const DISH_ART_KEYS = [
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

/** Recommended glass. */
export const GLASS_ART_KEYS = ["FLUTE", "SPARKLING_TULIP", "RED_BALLOON", "BORDEAUX", "WHITE_TULIP", "WHITE_BOWL", "ROSE", "DESSERT", "UNIVERSAL"] as const;

/** Every serving illustration: the glasses, the decanter, an uncorked bottle (no decanting needed) and the cellar. */
export const SERVING_ART_KEYS = [...GLASS_ART_KEYS, "DECANTER", "OPEN_BOTTLE", "CELLAR"] as const;

export type NoteArt = (typeof NOTE_ART_KEYS)[number];
export type DishArt = (typeof DISH_ART_KEYS)[number];
export type GlassArt = (typeof GLASS_ART_KEYS)[number];
export type ServingArt = (typeof SERVING_ART_KEYS)[number];

/** A descriptor as the profile wrote it, with the illustration that shows it. */
export interface ArtItem<Key extends string> {
  label: string;
  art: Key;
}

export interface ServingTemperature {
  min: number;
  max: number;
}

export interface ProfileArtServing {
  glass: GlassArt | null;
  decant: boolean;
  temperature: ServingTemperature | null;
}

export interface ProfileArt {
  aromas: ArtItem<NoteArt>[];
  flavors: ArtItem<NoteArt>[];
  pairings: ArtItem<DishArt>[];
  serving: ProfileArtServing;
}

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isKey<Key extends string>(keys: readonly Key[], value: unknown): value is Key {
  return keys.some((key) => key === value);
}

/** Known items only, one per illustration: unknown art shows nothing rather than a wrong picture. */
function toArtItems<Key extends string>(raw: unknown, keys: readonly Key[]): ArtItem<Key>[] {
  if (!Array.isArray(raw)) return [];
  const items: ArtItem<Key>[] = [];
  for (const entry of raw) {
    if (!isRecord(entry) || typeof entry.label !== "string" || !entry.label.trim()) continue;
    const art = entry.art;
    if (!isKey(keys, art) || items.some((item) => item.art === art)) continue;
    items.push({ label: entry.label.trim(), art });
  }
  return items;
}

function toTemperature(raw: unknown): ServingTemperature | null {
  if (!isRecord(raw)) return null;
  const { min, max } = raw;
  if (typeof min !== "number" || typeof max !== "number" || !Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

function toServing(raw: unknown): ProfileArtServing {
  const serving = isRecord(raw) ? raw : {};
  return {
    glass: isKey(GLASS_ART_KEYS, serving.glass) ? serving.glass : null,
    decant: serving.decant === true,
    temperature: toTemperature(serving.temperature),
  };
}

/** Validates the backend's `profileArt`; a missing or malformed value gives null. */
export function toProfileArt(raw: unknown): ProfileArt | null {
  if (!isRecord(raw)) return null;
  return {
    aromas: toArtItems(raw.aromas, NOTE_ART_KEYS),
    flavors: toArtItems(raw.flavors, NOTE_ART_KEYS),
    pairings: toArtItems(raw.pairings, DISH_ART_KEYS),
    serving: toServing(raw.serving),
  };
}
