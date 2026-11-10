/**
 * Maps the points API contract into the points domain model.
 */

import type { PointsEntry, PointsSummary } from './points.types'
import { parseBadgeTier, parsePointsSource, tierForPoints } from './points.tiers'

/** Structural input of `GET /users/me/points`, kept free of infrastructure imports. */
export interface PointsSummaryInput {
  points: number
  tier: string
  nextTier?: string | null
  nextTierAt?: number | null
  tierFloor: number
  todayEarned: number
  dailyCap: number
  pendingCelebration?: string | null
  showWelcome?: boolean | null
  recent?: PointsEntryInput[] | null
}

export interface PointsEntryInput {
  id: string
  source: string
  points: number
  createdAt: string
  label?: string | null
}

function mapPointsEntryFromDto(dto: PointsEntryInput): PointsEntry {
  return {
    id: dto.id,
    source: parsePointsSource(dto.source),
    points: dto.points,
    createdAt: new Date(dto.createdAt),
    label: dto.label ?? null,
  }
}

export function mapPointsSummaryFromDto(dto: PointsSummaryInput): PointsSummary {
  const nextTier = parseBadgeTier(dto.nextTier)
  return {
    points: dto.points,
    // An unknown key falls back to the tier the points reach, so the seal never disappears.
    tier: parseBadgeTier(dto.tier) ?? tierForPoints(dto.points),
    nextTier,
    nextTierAt: nextTier ? (dto.nextTierAt ?? null) : null,
    tierFloor: dto.tierFloor,
    todayEarned: dto.todayEarned,
    dailyCap: dto.dailyCap,
    pendingCelebration: parseBadgeTier(dto.pendingCelebration),
    showWelcome: dto.showWelcome ?? false,
    recent: (dto.recent ?? []).map(mapPointsEntryFromDto),
  }
}
