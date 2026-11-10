/**
 * Points DTOs — GET /users/me/points and POST /users/me/points/celebrations.
 * @contract: keep in sync with frontend-react/src/infrastructure/api/dto/points.dto.ts
 */

export type PointsSourceDto =
  | "REVIEW"
  | "REVIEW_NOTE"
  | "LIKE_RECEIVED"
  | "COMMENT"
  | "WINE_APPROVED"
  | "SCAN_MATCH"
  | "CELLAR_ADD"
  | "EVENT_REGISTRATION"
  | "PROFILE_COMPLETE";

export interface PointsEntryDto {
  id: string;
  source: PointsSourceDto | string;
  /** Negative for a revocation. */
  points: number;
  /** ISO-8601 instant. */
  createdAt: string;
  /** Related wine or event name, when there is one. */
  label?: string | null;
}

export interface PointsSummaryDto {
  points: number;
  tier: string;
  nextTier?: string | null;
  nextTierAt?: number | null;
  tierFloor: number;
  todayEarned: number;
  dailyCap: number;
  pendingCelebration?: string | null;
  showWelcome?: boolean | null;
  recent?: PointsEntryDto[] | null;
}

/** Marks a tier (and every lower one) as celebrated, or dismisses the welcome card. */
export type PointsCelebrationRequestDto = { tier: string } | { welcome: true };
