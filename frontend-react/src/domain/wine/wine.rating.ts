/**
 * Wine rating scale: 0.1 to 5.0 in steps of 0.1, shown as five glasses that
 * fill by fraction (2.2 = two full glasses and 0.2 of the third).
 */

export const RATING_MIN = 0.1
export const RATING_MAX = 5
export const RATING_STEP = 0.1
export const RATING_GLASSES = 5

/** One decimal, without clamping (for averages and stored values). */
export function roundRating(value: number): number {
  return Math.round(value * 10 + Number.EPSILON) / 10
}

/** A score the user can enter: one decimal, inside 0.1–5.0 (2.15 → 2.2). */
export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return RATING_MIN
  return Math.min(RATING_MAX, Math.max(RATING_MIN, roundRating(value)))
}

/** Moves a score by a key step, staying on the 0.1 grid. */
export function stepRating(value: number, delta: number): number {
  return clampRating(value + delta)
}

/** Whether the backend accepts the score: one decimal max, inside 0.1–5.0. */
export function isValidRating(value: number): boolean {
  return value >= RATING_MIN && value <= RATING_MAX && Math.abs(value * 10 - Math.round(value * 10)) < 1e-9
}

/** How full each of the five glasses is, from 0 (empty) to 1 (full). */
export function glassFills(value: number): number[] {
  return Array.from({ length: RATING_GLASSES }, (_, index) =>
    // Two decimals remove floating point noise (2.2 - 2 = 0.2000000000000002).
    Math.round(Math.min(1, Math.max(0, value - index)) * 100) / 100,
  )
}
