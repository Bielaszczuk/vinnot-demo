import type { BadgeTier } from "./badgeTiers";

export type PointsSource =
  | "REVIEW"
  | "REVIEW_NOTE"
  | "LIKE_RECEIVED"
  | "COMMENT"
  | "WINE_APPROVED"
  | "SCAN_MATCH"
  | "CELLAR_ADD"
  | "EVENT_REGISTRATION"
  | "PROFILE_COMPLETE"
  | "FOLLOWER_GAINED";

export interface PointsMovement {
  id: string;
  /** Null when the server sends a source this app version does not know. */
  source: PointsSource | null;
  /** Negative for a revocation. */
  points: number;
  createdAt: Date;
  label: string | null;
}

export interface PointsSummary {
  points: number;
  tier: BadgeTier;
  nextTier: BadgeTier | null;
  nextTierAt: number | null;
  tierFloor: number;
  todayEarned: number;
  dailyCap: number;
  /** Highest tier reached and not celebrated yet. */
  pendingCelebration: BadgeTier | null;
  showWelcome: boolean;
  recent: PointsMovement[];
}
