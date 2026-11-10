/** A small visible marker represents the scale origin, not a modified score. */
export function sensoryBarWidth(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(3, Math.min(100, score));
}
