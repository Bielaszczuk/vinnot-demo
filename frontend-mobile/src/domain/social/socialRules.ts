/**
 * Social rules shared by the profile, the lists and the Home sections.
 */
import {
  CELLAR_NOT_VISIBLE,
  TASTE_TRAIT_DEFAULT,
  TASTE_TRAIT_MAX,
  TASTE_TRAITS,
  TASTE_WHEEL_VIEWS,
  type TasteKind,
  type TasteSlice,
  type TasteStructureAdjustment,
  type TasteTrait,
  type TasteTraitLevel,
  type TasteTraitScore,
} from "./social.types";

/** The backend refuses a cellar the viewer may not see with 403 CELLAR_NOT_VISIBLE. */
export function isCellarHiddenError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, status } = error as { code?: unknown; status?: unknown };
  return code === CELLAR_NOT_VISIBLE || status === 403;
}

/**
 * Followers shown while a follow change is on its way: the server count moves by one
 * when the shown state differs from the server state, never below zero.
 */
export function followersCountShown(serverCount: number, serverFollowing: boolean, shownFollowing: boolean): number {
  if (serverFollowing === shownFollowing) return serverCount;
  return Math.max(0, serverCount + (shownFollowing ? 1 : -1));
}

/** Word for a 0-100 structure score: under 34 low, under 67 medium, otherwise high. */
export function tasteTraitLevel(score: number): TasteTraitLevel {
  if (score < 34) return "LOW";
  if (score < 67) return "MEDIUM";
  return "HIGH";
}

/** A structure value the member can set: a whole number from 0 to 100. */
export function clampTasteTraitValue(value: number): number {
  return Math.min(TASTE_TRAIT_MAX, Math.max(0, Math.round(value)));
}

/** Where each slider starts: the profile's value, or the middle for a trait it lacks. */
export function tasteEditorValues(structure: readonly TasteTraitScore[]): Record<TasteTrait, number> {
  const known = new Map(structure.map((row) => [row.trait, clampTasteTraitValue(row.score)]));
  return Object.fromEntries(
    TASTE_TRAITS.map((trait) => [trait, known.get(trait) ?? TASTE_TRAIT_DEFAULT]),
  ) as Record<TasteTrait, number>;
}

/**
 * The manual values to save: only touched traits, and of those only the ones that moved
 * away from where they started. A trait the profile lacked is saved once touched, since
 * its starting point was only a placeholder.
 */
export function tasteStructureChanges(
  structure: readonly TasteTraitScore[],
  values: Record<TasteTrait, number>,
  touched: ReadonlySet<TasteTrait>,
): TasteStructureAdjustment {
  const start = tasteEditorValues(structure);
  const known = new Set(structure.map((row) => row.trait));
  const changes: TasteStructureAdjustment = {};
  for (const trait of TASTE_TRAITS) {
    if (touched.has(trait) && (!known.has(trait) || values[trait] !== start[trait])) changes[trait] = values[trait];
  }
  return changes;
}

/** Views of the taste wheel that have entries, grapes first; the first one opens by default. */
export function tasteWheelViews(slices: readonly TasteSlice[]): TasteKind[] {
  return TASTE_WHEEL_VIEWS.filter((kind) => slices.some((slice) => slice.kind === kind));
}

/** One kind per view: the wheel never mixes grapes, styles and regions. */
export function tasteWheelSlicesOf(slices: readonly TasteSlice[], kind: TasteKind): TasteSlice[] {
  return slices.filter((slice) => slice.kind === kind);
}
