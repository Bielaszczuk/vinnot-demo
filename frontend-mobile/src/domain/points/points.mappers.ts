import { badgeTierForPoints, parseBadgeTier } from "./badgeTiers";
import type { PointsMovement, PointsSource, PointsSummary } from "./points.types";

const SOURCES: readonly PointsSource[] = [
  "REVIEW",
  "REVIEW_NOTE",
  "LIKE_RECEIVED",
  "COMMENT",
  "WINE_APPROVED",
  "SCAN_MATCH",
  "CELLAR_ADD",
  "EVENT_REGISTRATION",
  "PROFILE_COMPLETE",
];

/** Raw points response as the API sends it (see `PointsSummaryDto`). */
export interface PointsSummaryInput {
  points: number;
  tier: string;
  nextTier?: string | null;
  nextTierAt?: number | null;
  tierFloor: number;
  todayEarned: number;
  dailyCap: number;
  pendingCelebration?: string | null;
  showWelcome?: boolean | null;
  recent?: { id: string; source: string; points: number; createdAt: string; label?: string | null }[] | null;
}

function mapMovement(entry: NonNullable<PointsSummaryInput["recent"]>[number]): PointsMovement {
  return {
    id: entry.id,
    source: (SOURCES as readonly string[]).includes(entry.source) ? (entry.source as PointsSource) : null,
    points: entry.points,
    createdAt: new Date(entry.createdAt),
    label: entry.label ?? null,
  };
}

export function mapPointsSummary(dto: PointsSummaryInput): PointsSummary {
  return {
    points: dto.points,
    // An unknown key falls back to the tier the points reach, so the seal never shows a wrong tier.
    tier: parseBadgeTier(dto.tier) ?? badgeTierForPoints(dto.points),
    nextTier: parseBadgeTier(dto.nextTier),
    nextTierAt: dto.nextTierAt ?? null,
    tierFloor: dto.tierFloor,
    todayEarned: dto.todayEarned,
    dailyCap: dto.dailyCap,
    pendingCelebration: parseBadgeTier(dto.pendingCelebration),
    showWelcome: dto.showWelcome === true,
    recent: (dto.recent ?? []).map(mapMovement),
  };
}
