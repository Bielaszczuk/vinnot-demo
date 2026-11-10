const MAXIMUM_BASIS_POINTS = 3000

/**
 * The Vinnot ticket commission as a percentage (300 basis points is 3).
 * A missing or invalid value gives no rate, so the UI never shows a guessed one.
 */
export function commissionPercent(basisPoints: unknown): number | null {
  if (typeof basisPoints !== 'number' || !Number.isInteger(basisPoints)
    || basisPoints < 1 || basisPoints > MAXIMUM_BASIS_POINTS) return null
  return basisPoints / 100
}
