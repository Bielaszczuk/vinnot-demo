import { TASTE_TRAITS, type TasteLevel, type TasteStructureChanges, type TasteTrait, type TasteTraitKey } from './social.types'

/** Reads a 0-100 trait score as a level: low under 34, medium under 67, high from 67. */
export function tasteLevel(score: number): TasteLevel {
  if (score < 34) return 'LOW'
  if (score < 67) return 'MEDIUM'
  return 'HIGH'
}

/** Where a trait without data starts when the member adjusts it: the middle of the scale. */
export const TASTE_SCORE_DEFAULT = 50

/** A hand-set score: a whole number from 0 to 100. */
export function clampTasteScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** The scores the member starts adjusting from: the shown ones, and the middle for every trait without data. */
export function structureDraft(structure: readonly TasteTrait[]): Record<TasteTraitKey, number> {
  const known = new Map(structure.map((entry) => [entry.trait, clampTasteScore(entry.score)]))
  return Object.fromEntries(TASTE_TRAITS.map((trait) => [trait, known.get(trait) ?? TASTE_SCORE_DEFAULT])) as Record<TasteTraitKey, number>
}

/**
 * What to save from an adjustment: the traits whose score changed, and the traits without data that the member
 * touched (their starting point is not a value of theirs). Nothing else is sent.
 */
export function structureChanges(
  structure: readonly TasteTrait[],
  draft: Record<TasteTraitKey, number>,
  touched: ReadonlySet<TasteTraitKey>,
): TasteStructureChanges {
  const start = structureDraft(structure)
  const known = new Set(structure.map((entry) => entry.trait))
  const changes: TasteStructureChanges = {}
  for (const trait of TASTE_TRAITS) {
    const changed = known.has(trait) ? draft[trait] !== start[trait] : touched.has(trait)
    if (changed) changes[trait] = clampTasteScore(draft[trait])
  }
  return changes
}
