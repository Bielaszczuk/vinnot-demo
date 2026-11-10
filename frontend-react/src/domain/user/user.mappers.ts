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
  is_verified?: boolean
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

type UserProfileInput = {
  id: string | number
  name: string
  avatar?: string | null
  bio?: string | null
  location?: string | null
  favorite_wines?: string[]
  review_count?: number
  joined_at: string
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
    id: String(dto.id),
    name: dto.name,
    avatar: dto.avatar ?? null,
    bio: dto.bio ?? null,
    location: dto.location ?? null,
    favoriteWines: dto.favorite_wines ?? [],
    reviewCount: dto.review_count ?? 0,
    joinedAt: new Date(dto.joined_at),
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
