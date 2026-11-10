/**
 * Points and wax-seal emblem domain types.
 *
 * Users earn points for real activity; their current points pick one of
 * eleven tiers, each drawn as a wax seal. The ladder and the rules live in
 * the backend; the frontend only reads them.
 */

/** Tier keys, lowest first, as sent by the API. */
export type BadgeTier =
  | 'BROTE'
  | 'PARRA'
  | 'RACIMO'
  | 'VENDIMIA'
  | 'LAGAR'
  | 'BARRICA'
  | 'CRIANZA'
  | 'RESERVA'
  | 'GRAN_RESERVA'
  | 'GRAN_ENOFILO'
  | 'VINNOT'

/** Activity that awarded (or revoked) points. */
export type PointsSource =
  | 'REVIEW'
  | 'REVIEW_NOTE'
  | 'LIKE_RECEIVED'
  | 'COMMENT'
  | 'WINE_APPROVED'
  | 'SCAN_MATCH'
  | 'CELLAR_ADD'
  | 'EVENT_REGISTRATION'
  | 'PROFILE_COMPLETE'

/** One movement in the points history; revocations have negative points. */
export interface PointsEntry {
  id: string
  /** `null` when the backend sends a source this version does not know. */
  source: PointsSource | null
  points: number
  createdAt: Date
  /** Related wine or event name, when there is one. */
  label: string | null
}

/** The signed-in user's points, tier and history. */
export interface PointsSummary {
  points: number
  tier: BadgeTier
  /** `null` at the top tier. */
  nextTier: BadgeTier | null
  /** Points needed for the next tier; `null` at the top tier. */
  nextTierAt: number | null
  /** Points at which the current tier starts. */
  tierFloor: number
  todayEarned: number
  dailyCap: number
  /** Highest tier reached and not yet celebrated. */
  pendingCelebration: BadgeTier | null
  /** One-time welcome card after the historical backfill. */
  showWelcome: boolean
  recent: PointsEntry[]
}

/** Where the user stands between the current tier and the next one. */
export interface TierProgress {
  /** 0 at the tier floor, 1 at the next tier (and always 1 at the top). */
  fraction: number
  /** Points still missing; `null` at the top tier. */
  remaining: number | null
}
