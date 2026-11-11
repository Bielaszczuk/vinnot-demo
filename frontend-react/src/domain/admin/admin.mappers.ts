/**
 * Admin domain mappers
 *
 * Pure functions to transform raw backend responses into typed domain models.
 * These mappers belong in the domain layer — NOT in the API client layer.
 *
 * Responsibility split:
 *   - admin.client.ts  → HTTP mechanics + structural response normalization (items/content shape)
 *   - admin.mappers.ts → Business-level field mapping, defaults, role normalization
 *   - admin.service.ts → Orchestration: calls client → applies mappers → returns domain type
 */

import { parseBadgeTier } from '@domain/points/points.tiers'
import { roundRating } from '@domain/wine/wine.rating'
import type {
  AdminReview,
  AdminStats,
  AdminUser,
  AdminWine,
} from './admin.types'

// ── Stats ────────────────────────────────────────────────────────────────────

/**
 * Raw backend shape for AdminStats (AdminStatsResponse Java record).
 * Backend exposes both the record field names AND @JsonProperty aliases.
 */
export interface AdminStatsRaw {
  // @JsonProperty aliases (what the backend actually sends)
  users?: number
  wines?: number
  wineries?: number
  events?: number
  reviews?: number
  routes?: number
  // Direct record field names (fallback)
  totalUsers?: number
  totalWines?: number
  totalWineries?: number
  totalEvents?: number
  totalReviews?: number
  totalRoutes?: number
  // Extended stats
  activeUsers?: number
  publishedEvents?: number
  publishedRoutes?: number
}

/**
 * Map raw backend AdminStatsResponse to domain AdminStats.
 * Handles both @JsonProperty aliases and direct record field names.
 */
export function mapAdminStatsFromRaw(raw: AdminStatsRaw): AdminStats {
  return {
    users: raw.users ?? raw.totalUsers ?? 0,
    wines: raw.wines ?? raw.totalWines ?? 0,
    wineries: raw.wineries ?? raw.totalWineries ?? 0,
    events: raw.events ?? raw.totalEvents ?? 0,
    reviews: raw.reviews ?? raw.totalReviews ?? 0,
    routes: raw.routes ?? raw.totalRoutes ?? 0,
    activeUsers: raw.activeUsers ?? null,
    publishedEvents: raw.publishedEvents ?? null,
    publishedRoutes: raw.publishedRoutes ?? null,
  }
}

// ── Users ────────────────────────────────────────────────────────────────────

/**
 * Map raw backend user response to AdminUser domain model.
 *
 * Handles:
 *  - firstName + lastName concatenation into a single `name` field
 *  - Role normalization to ROLE_* prefix format
 *  - active/enabled field alias
 */
export function mapAdminUserFromRaw(raw: Record<string, unknown>): AdminUser {
  const firstName = (raw.firstName ?? null) as string | null
  const lastName = (raw.lastName ?? null) as string | null
  const rawName = (raw.name ?? null) as string | null
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || rawName || null

  // /users sends a `roles` list; /admin/users sends one comma-separated `role`.
  const rawRoles = raw.roles ?? raw.role
  const rolesArray = Array.isArray(rawRoles)
    ? rawRoles.map((r) => String(r))
    : typeof rawRoles === 'string'
      ? rawRoles.split(',').map((r) => r.trim()).filter(Boolean)
      : []

  const normalizedRoles = rolesArray.map((role) =>
    role.startsWith('ROLE_') ? role : `ROLE_${role.toUpperCase()}`,
  )

  return {
    id: String(raw.id),
    username: String(raw.username ?? ''),
    email: String(raw.email ?? ''),
    name: fullName,
    firstName,
    lastName,
    roles: normalizedRoles.length > 0 ? normalizedRoles : ['ROLE_USER'],
    enabled: Boolean(raw.enabled ?? raw.active ?? false),
    locked: Boolean(raw.locked ?? false),
    lockReason: (raw.lockReason ?? null) as string | null,
    lastLoginAt: (raw.lastLoginAt ?? null) as string | null,
    createdAt: String(raw.createdAt ?? ''),
    points: Number(raw.points ?? 0),
    badgeTier: parseBadgeTier(raw.badgeTier),
    avatarUrl: typeof raw.avatarUrl === 'string' && raw.avatarUrl ? raw.avatarUrl : null,
  }
}

// ── Reviews ──────────────────────────────────────────────────────────────────

/**
 * Map a raw admin review: one-decimal rating and the reviewer's seal tier.
 */
export function mapAdminReviewFromRaw(raw: Record<string, unknown>): AdminReview {
  const reviewer = (raw.reviewer ?? null) as Record<string, unknown> | null
  const wine = (raw.wine ?? null) as Record<string, unknown> | null
  return {
    id: String(raw.id),
    wineId: String(raw.wineId ?? wine?.id ?? ''),
    rating: roundRating(Number(raw.rating ?? 0)),
    title: (raw.title ?? null) as string | null,
    comment: (raw.comment ?? null) as string | null,
    likesCount: Number(raw.likesCount ?? 0),
    isVerified: Boolean(raw.isVerified ?? false),
    createdAt: String(raw.createdAt ?? ''),
    reviewer: reviewer
      ? {
          id: String(reviewer.id),
          username: String(reviewer.username ?? ''),
          displayName: String(reviewer.displayName ?? reviewer.username ?? ''),
          avatarUrl: (reviewer.avatarUrl ?? null) as string | null,
          badgeTier: parseBadgeTier(reviewer.badgeTier),
        }
      : null,
    wine: wine
      ? { id: String(wine.id), name: String(wine.name ?? ''), vintage: (wine.vintage ?? null) as number | null }
      : null,
  }
}

// ── Wines ────────────────────────────────────────────────────────────────────

/**
 * Map raw backend wine detail response to AdminWine domain model.
 * Used when the backend returns a non-standard shape for a single wine.
 */
export function mapAdminWineFromRaw(raw: Record<string, unknown>): AdminWine {
  return {
    id: raw.id as string,
    name: raw.name as string,
    vintage: (raw.vintage ?? null) as number | null,
    wineType: (raw.wineType ?? 'RED') as string,
    wineryId: (raw.wineryId ?? '') as string,
    wineryName: (raw.wineryName ?? '') as string,
    region: (raw.region ?? raw.regionName ?? '') as string,
    country: (raw.country ?? raw.countryName ?? '') as string,
    style: (raw.style ?? null) as string | null,
    grapes: (raw.grapes ?? []) as string[],
    allergens: (raw.allergens ?? []) as string[],
    alcoholContent: (raw.alcoholContent ?? null) as number | null,
    descriptionEn: (raw.descriptionEn ?? null) as string | null,
    descriptionEs: (raw.descriptionEs ?? null) as string | null,
    imageUrl: (raw.imageUrl ?? null) as string | null,
    priceMin: (raw.priceMin ?? null) as number | null,
    priceMax: (raw.priceMax ?? null) as number | null,
    ratingAverage: (raw.ratingAverage ?? null) as number | null,
    isFeatured: (raw.isFeatured ?? raw.featured ?? false) as boolean,
    isActive: (raw.isActive ?? raw.active ?? true) as boolean,
    createdAt: (raw.createdAt ?? '') as string,
    acidityScore: (raw.acidityScore ?? null) as number | null,
    tanninScore: (raw.tanninScore ?? null) as number | null,
    bodyScore: (raw.bodyScore ?? null) as number | null,
    sweetnessScore: (raw.sweetnessScore ?? null) as number | null,
  }
}


export function mapAdminWineryFromRaw(raw: Record<string, unknown>): import("./admin.types").AdminWinery {
 return {
  id: String(raw.id ?? ""),
  name: String(raw.name ?? ""),
  countryName: (raw.countryName ?? null) as string | null,
  countryId: (raw.countryId ?? null) as string | null,
  regionName: (raw.regionName ?? null) as string | null,
  regionId: (raw.regionId ?? null) as string | null,
  winesCount: Number(raw.winesCount ?? 0),
  createdAt: String(raw.createdAt ?? ""),
  subregion: (raw.subregion ?? null) as string | null,
  description: (raw.description ?? null) as string | null,
  descriptionEs: (raw.descriptionEs ?? null) as string | null,
  descriptionEn: (raw.descriptionEn ?? null) as string | null,
  address: (raw.address ?? null) as string | null,
  email: (raw.email ?? null) as string | null,
  phone: (raw.phone ?? null) as string | null,
  website: (raw.website ?? null) as string | null,
  logoUrl: (raw.logoUrl ?? null) as string | null,
  imageUrl: (raw.imageUrl ?? null) as string | null,
  latitude: (raw.latitude ?? null) as number | null,
  longitude: (raw.longitude ?? null) as number | null,
  establishedYear: (raw.establishedYear ?? null) as number | null,
 };
}
