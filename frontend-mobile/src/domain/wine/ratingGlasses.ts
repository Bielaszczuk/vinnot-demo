/** Ratings go from 0.1 to 5.0 in steps of 0.1 (S8). */
export const RATING_MIN = 0.1;
export const RATING_MAX = 5;
export const RATING_STEP = 0.1;

/**
 * How full each glass of a rating scale is, as a fraction: 2.2 of 5 is two
 * full glasses, a fifth of the third and two empty glasses. Fractions keep two
 * decimals so averages such as 4.33 still read precisely.
 */
export function ratingGlassFills(rating: number | null | undefined, max = 5): number[] {
  const clamped = Math.min(Math.max(rating ?? 0, 0), max);
  return Array.from({ length: max }, (_, index) => {
    const fill = Math.min(1, Math.max(0, clamped - index));
    return Math.round(fill * 100) / 100;
  });
}

/**
 * Snaps any value to the rating scale: one decimal, between 0.1 and 5.0.
 * Rounds through thousandths first so binary noise never turns 2.15 into 2.1.
 */
export function snapRating(value: number): number {
  "worklet";
  const tenths = Math.round(Math.round(value * 1000) / 100);
  return Math.min(RATING_MAX, Math.max(RATING_MIN, tenths / 10));
}

/** One tenth up or down; an empty rating (0) starts at 0.1. */
export function stepRating(value: number, direction: 1 | -1): number {
  return value <= 0 ? RATING_MIN : snapRating(value + direction * RATING_STEP);
}
