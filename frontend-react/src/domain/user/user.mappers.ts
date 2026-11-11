import { parseBadgeTier } from '@domain/points/points.tiers'
import { mapTasteTraits, mapTasteWheel, parseCellarVisibility } from '@domain/social/social.mappers'
import type { User, UserPreferences, UserProfile, UserStats, NotificationPreferences, PriceRange, SocialProvider, UserRole } from './user.types'

type NotificationPreferencesInput = {
  email?: boolean
  push?: boolean
  events?: boolean
  recommendations?: boolean
  newsletter?: boolean
}

type UserPreferencesInput = {
  favorite_wine_types?: string[]
  favorite_regions?: string[]
  price_range?: { min: number; max: number } | null
  notifications?: NotificationPreferencesInput | null
  locale?: string
  theme?: 'light' | 'dark' | 'system'
}

type UserInput = {
  id: string
  username?: string
  email: string
  phoneNumber?: string | null
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
  name?: string | null
  avatarUrl?: string | null
  avatar?: string | null
  roles?: string[]
  preferences?: UserPreferencesInput | null
  emailVerified?: boolean
  hasSocialIdentity?: boolean
  /** Absent on older APIs; an account without a social identity always has a password. */
  hasPassword?: boolean
  socialProviders?: string[]
  onboardingCompleted?: boolean
  bio?: string | null
  cellarVisibility?: string | null
  is_verified?: boolean
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

type UserProfileInput = {
  id: string
  username: string
  roles?: string[]
  fullName?: string | null
  avatarUrl?: string | null
  createdAt: string
  bio?: string | null
  tier?: string | null
  followersCount?: number | null
  followingCount?: number | null
  reviewsCount?: number | null
  cellarCount?: number | null
  cellarVisible?: boolean | null
  following?: boolean | null
  followsYou?: boolean | null
  affinityPercent?: number | null
  tasteWheel?: { kind: string; value: string; label: string; score: number; tone?: string | null; ratedWines?: number | null }[] | null
  tasteTraits?: Parameters<typeof mapTasteTraits>[0]
}

type UserStatsInput = {
  totalReviews?: number
  reviewsCount?: number
  total_reviews?: number
  totalCellarWines?: number
  total_wines_tasted?: number
  eventsAttended?: number
  total_events_attended?: number
  total_routes_completed?: number
  cellarCount?: number
  cellar_size?: number
  averageRating?: number
}

/**
 * Map role string to UserRole
 */
function mapRole(role: string): UserRole {

  const roleMap: Record<string, UserRole> = {
    'user': 'ROLE_USER',
    'admin': 'ROLE_ADMIN',
    'moderator': 'ROLE_MODERATOR',
    'partner': 'ROLE_PARTNER',
    'USER': 'ROLE_USER',
    'ADMIN': 'ROLE_ADMIN',
    'MODERATOR': 'ROLE_MODERATOR',
    'PARTNER': 'ROLE_PARTNER',
    'ROLE_USER': 'ROLE_USER',
    'ROLE_ADMIN': 'ROLE_ADMIN',
    'ROLE_MODERATOR': 'ROLE_MODERATOR',
    'ROLE_PARTNER': 'ROLE_PARTNER',
  }
  return roleMap[role] ?? 'ROLE_USER'
}

/**
 * Map User DTO to domain model
 * Handles both camelCase (backend) and snake_case (legacy) formats
 */
export function mapUserFromDto(dto: UserInput): User {
  return {
    id: dto.id,
    username: dto.username ?? '',
    email: dto.email,
    phoneNumber: dto.phoneNumber ?? null,
    firstName: dto.firstName ?? '',
    lastName: dto.lastName ?? '',
    name: dto.fullName ?? dto.name
      ?? [dto.firstName, dto.lastName].filter(Boolean).join(' '),
    avatar: dto.avatarUrl ?? dto.avatar ?? null,
    roles: (dto.roles ?? ['ROLE_USER']).map(mapRole),
    preferences: dto.preferences ? mapUserPreferencesFromDto(dto.preferences) : getDefaultPreferences(),
    isVerified: dto.emailVerified ?? dto.is_verified ?? false,
    hasSocialIdentity: dto.hasSocialIdentity ?? false,
    hasPassword: dto.hasPassword ?? !(dto.hasSocialIdentity ?? false),
    socialProviders: (dto.socialProviders ?? []) as SocialProvider[],
    onboardingCompleted: dto.onboardingCompleted ?? true,
    bio: dto.bio ?? null,
    cellarVisibility: parseCellarVisibility(dto.cellarVisibility),
    createdAt: new Date(dto.createdAt ?? dto.created_at ?? new Date().toISOString()),
    updatedAt: new Date(dto.updatedAt ?? dto.updated_at ?? new Date().toISOString()),
  }
}

/**
 * Map User preferences DTO to domain model
 */
export function mapUserPreferencesFromDto(dto: UserPreferencesInput): UserPreferences {
  return {
    favoriteWineTypes: dto.favorite_wine_types ?? [],
    favoriteRegions: dto.favorite_regions ?? [],
    priceRange: dto.price_range ? mapPriceRangeFromDto(dto.price_range) : null,
    notifications: mapNotificationPreferencesFromDto(dto.notifications),
    locale: dto.locale ?? 'es-AR',
    theme: dto.theme ?? 'system',
  }
}

/**
 * Map price range from DTO
 */
function mapPriceRangeFromDto(dto: { min: number; max: number }): PriceRange {
  return {
    min: dto.min,
    max: dto.max,
  }
}

/**
 * Map notification preferences from DTO
 */
function mapNotificationPreferencesFromDto(dto?: NotificationPreferencesInput | null): NotificationPreferences {
  return {
    email: dto?.email ?? true,
    push: dto?.push ?? false,
    events: dto?.events ?? true,
    recommendations: dto?.recommendations ?? true,
    newsletter: dto?.newsletter ?? false,
  }
}

/**
 * Get default user preferences
 */
function getDefaultPreferences(): UserPreferences {
  return {
    favoriteWineTypes: [],
    favoriteRegions: [],
    priceRange: null,
    notifications: {
      email: true,
      push: false,
      events: true,
      recommendations: true,
      newsletter: false,
    },
    locale: 'es-AR',
    theme: 'system',
  }
}

/**
 * Map User profile DTO to domain model
 */
export function mapUserProfileFromDto(dto: UserProfileInput): UserProfile {
  return {
    id: dto.id,
    username: dto.username,
    displayName: dto.fullName?.trim() || dto.username,
    avatar: dto.avatarUrl ?? null,
    joinedAt: new Date(dto.createdAt),
    bio: dto.bio ?? null,
    tier: parseBadgeTier(dto.tier),
    followersCount: dto.followersCount ?? 0,
    followingCount: dto.followingCount ?? 0,
    reviewsCount: dto.reviewsCount ?? 0,
    cellarCount: dto.cellarCount ?? null,
    cellarVisible: dto.cellarVisible ?? false,
    following: dto.following ?? false,
    followsYou: dto.followsYou ?? false,
    affinityPercent: dto.affinityPercent ?? null,
    tasteWheel: mapTasteWheel(dto.tasteWheel),
    tasteTraits: mapTasteTraits(dto.tasteTraits),
  }
}

/**
 * Map User stats DTO to domain model
 * Handles both camelCase (backend) and snake_case (legacy) formats
 */
export function mapUserStatsFromDto(dto: UserStatsInput): UserStats {
  return {
    totalReviews: dto.totalReviews ?? dto.reviewsCount ?? dto.total_reviews ?? 0,
    totalWinesTasted: dto.totalCellarWines ?? dto.total_wines_tasted ?? 0,
    totalEventsAttended: dto.eventsAttended ?? dto.total_events_attended ?? 0,
    totalRoutesCompleted: dto.total_routes_completed ?? 0,
    cellarSize: dto.cellarCount ?? dto.totalCellarWines ?? dto.cellar_size ?? 0,
    averageRating: dto.averageRating ?? 0,
  }
}

/**
 * Map User domain model to DTO for API requests
 */
export function mapUserToDto(user: Partial<User>): Partial<UserInput> {
  return {
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatar ?? undefined,
  }
}
