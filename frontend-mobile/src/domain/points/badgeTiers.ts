/**
 * The wax-seal ladder: eleven tiers reached by current points.
 * @contract: keys and thresholds match the backend gamification module and the web client.
 * Display names live in the locale files (`points.tiers.<KEY>`), one per language.
 */

export const BADGE_TIER_KEYS = [
  "BROTE",
  "PARRA",
  "RACIMO",
  "VENDIMIA",
  "LAGAR",
  "BARRICA",
  "CRIANZA",
  "RESERVA",
  "GRAN_RESERVA",
  "GRAN_ENOFILO",
  "VINNOT",
] as const;

export type BadgeTier = (typeof BADGE_TIER_KEYS)[number];

/** Lower-case key with dashes, as used by the seal art files. */
export type BadgeTierSlug =
  | "brote"
  | "parra"
  | "racimo"
  | "vendimia"
  | "lagar"
  | "barrica"
  | "crianza"
  | "reserva"
  | "gran-reserva"
  | "gran-enofilo"
  | "vinnot";

export interface BadgeTierInfo {
  key: BadgeTier;
  slug: BadgeTierSlug;
  threshold: number;
}

const THRESHOLDS: Record<BadgeTier, number> = {
  BROTE: 0,
  PARRA: 30,
  RACIMO: 80,
  VENDIMIA: 160,
  LAGAR: 280,
  BARRICA: 450,
  CRIANZA: 700,
  RESERVA: 1000,
  GRAN_RESERVA: 1600,
  GRAN_ENOFILO: 2600,
  VINNOT: 5000,
};

export function badgeTierSlug(tier: BadgeTier): BadgeTierSlug {
  return tier.toLowerCase().replace(/_/g, "-") as BadgeTierSlug;
}

export function badgeTierThreshold(tier: BadgeTier): number {
  return THRESHOLDS[tier];
}

export const BADGE_TIERS: readonly BadgeTierInfo[] = BADGE_TIER_KEYS.map((key) => ({
  key,
  slug: badgeTierSlug(key),
  threshold: THRESHOLDS[key],
}));

/** The highest tier the points reach. */
export function badgeTierForPoints(points: number): BadgeTier {
  let reached: BadgeTier = "BROTE";
  for (const tier of BADGE_TIERS) {
    if (points >= tier.threshold) reached = tier.key;
  }
  return reached;
}

/** A known tier key, or null for a missing, hidden or unknown badge. */
export function parseBadgeTier(value: unknown): BadgeTier | null {
  return typeof value === "string" && (BADGE_TIER_KEYS as readonly string[]).includes(value)
    ? (value as BadgeTier)
    : null;
}

export interface TierProgressInput {
  points: number;
  tierFloor: number;
  nextTier: BadgeTier | null;
  nextTierAt: number | null;
}

export interface TierProgress {
  /** Share of the way from the current tier to the next one, 0..1 with two decimals. */
  fraction: number;
  /** Points still missing for the next tier; 0 at the top. */
  remaining: number;
  nextTier: BadgeTier | null;
}

export function tierProgress({ points, tierFloor, nextTier, nextTierAt }: TierProgressInput): TierProgress {
  if (!nextTier || nextTierAt == null) return { fraction: 1, remaining: 0, nextTier: null };
  const span = Math.max(1, nextTierAt - tierFloor);
  const raw = Math.min(1, Math.max(0, (points - tierFloor) / span));
  return {
    fraction: Math.round(raw * 100) / 100,
    remaining: Math.max(0, nextTierAt - points),
    nextTier,
  };
}
