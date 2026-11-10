/**
 * Tier ladder rules shared by every emblem surface. Pure functions, no
 * framework code.
 */

import type { BadgeTier, PointsSource, TierProgress } from './points.types'

/** The ladder, lowest tier first, with the points each tier starts at. */
const LADDER: ReadonlyArray<readonly [BadgeTier, number]> = [
  ['BROTE', 0],
  ['PARRA', 30],
  ['RACIMO', 80],
  ['VENDIMIA', 160],
  ['LAGAR', 280],
  ['BARRICA', 450],
  ['CRIANZA', 700],
  ['RESERVA', 1000],
  ['GRAN_RESERVA', 1600],
  ['GRAN_ENOFILO', 2600],
  ['VINNOT', 5000],
]

export const BADGE_TIERS: readonly BadgeTier[] = LADDER.map(([tier]) => tier)

export const POINTS_SOURCES: readonly PointsSource[] = [
  'REVIEW',
  'REVIEW_NOTE',
  'LIKE_RECEIVED',
  'COMMENT',
  'WINE_APPROVED',
  'SCAN_MATCH',
  'CELLAR_ADD',
  'EVENT_REGISTRATION',
  'PROFILE_COMPLETE',
]

const THRESHOLDS = new Map<BadgeTier, number>(LADDER)

/** Position of the tier on the ladder, 0 for Brote. */
export function tierIndex(tier: BadgeTier): number {
  return BADGE_TIERS.indexOf(tier)
}

/** Points at which the tier starts. */
export function tierThreshold(tier: BadgeTier): number {
  return THRESHOLDS.get(tier) ?? 0
}

/** Art file name: the key in lower case with dashes (`GRAN_RESERVA` → `gran-reserva`). */
export function tierSlug(tier: BadgeTier): string {
  return tier.toLowerCase().replace(/_/g, '-')
}

/** A tier key from the API, or `null` for anything this version does not know. */
export function parseBadgeTier(value: unknown): BadgeTier | null {
  return typeof value === 'string' && THRESHOLDS.has(value as BadgeTier) ? (value as BadgeTier) : null
}

/** A points source from the API, or `null` for anything this version does not know. */
export function parsePointsSource(value: unknown): PointsSource | null {
  return typeof value === 'string' && POINTS_SOURCES.includes(value as PointsSource) ? (value as PointsSource) : null
}

/** The highest tier the points reach. */
export function tierForPoints(points: number): BadgeTier {
  let reached: BadgeTier = 'BROTE'
  for (const [tier, threshold] of LADDER) {
    if (points >= threshold) reached = tier
  }
  return reached
}

/** Progress from the tier floor to the next tier, rounded to two decimals. */
export function tierProgress({
  points,
  tierFloor,
  nextTierAt,
}: {
  points: number
  tierFloor: number
  nextTierAt: number | null
}): TierProgress {
  if (nextTierAt === null) return { fraction: 1, remaining: null }
  const span = nextTierAt - tierFloor
  const raw = span > 0 ? (points - tierFloor) / span : 1
  const fraction = Math.round(Math.min(1, Math.max(0, raw)) * 100) / 100
  return { fraction, remaining: Math.max(0, nextTierAt - points) }
}
