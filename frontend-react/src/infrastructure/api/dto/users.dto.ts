/**
 * User DTOs
 *
 * Data Transfer Objects for user API endpoints.
 * These represent the exact shape of data sent to/from the backend.
 * Note: Backend uses camelCase for all JSON fields.
 */

export type UserRoleDto = 'ROLE_ADMIN' | 'ROLE_MODERATOR' | 'ROLE_PARTNER' | 'ROLE_USER'



/**
 * Full user data (admin/self view)
 * Supports both camelCase (backend) and snake_case (legacy) fields
 */
export interface UserDto {
  phoneNumber?: string | null
  id: string
  username?: string
  email: string
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
  name: string
  avatar?: string | null
  avatarUrl?: string | null
  roles?: string[]
  preferences?: UserPreferencesDto | null

  emailVerified?: boolean
  hasSocialIdentity?: boolean
  hasPassword?: boolean
  socialProviders?: string[]
  onboardingCompleted?: boolean
  preferredLanguage?: 'es' | 'en'
  timezone?: string
  isActive?: boolean
  lastLoginAt?: string | null
  createdAt?: string
  updatedAt?: string

  is_verified?: boolean
  is_active?: boolean
  last_login_at?: string | null
  created_at?: string
  updated_at?: string
}

/**
 * User preferences structure
 */
export interface UserPreferencesDto {
  favorite_wine_types?: string[]
  favorite_regions?: string[]
  price_range?: PriceRangeDto | null
  notifications?: NotificationPreferencesDto | null
  locale?: string
  theme?: 'light' | 'dark' | 'system'
}

/**
 * Price range structure
 */
export interface PriceRangeDto {
  min: number
  max: number
}

/**
 * Notification preferences structure
 */
export interface NotificationPreferencesDto {
  email?: boolean
  push?: boolean
  events?: boolean
  recommendations?: boolean
  newsletter?: boolean
}



/**
 * Public user profile
 */
export interface UserProfileDto {
  id: string
  name: string
  avatar?: string | null
  bio?: string | null
  location?: string | null
  favorite_wines?: string[]
  review_count?: number
  follower_count?: number
  following_count?: number
  is_following?: boolean
  joined_at: string
}

/**
 * User statistics
 */
export interface UserStatsDto {
  total_reviews?: number
  total_wines_tasted?: number
  total_events_attended?: number
  total_routes_completed?: number
  cellar_size?: number
  // camelCase variants from backend
  totalReviews?: number
  reviewsCount?: number
  totalCellarWines?: number
  cellarCount?: number
  eventsAttended?: number
  averageRating?: number
}

/**
 * GET /users/me/points: current points, wax-seal tier and the last 20 movements.
 * Tier fields are tier keys (`BROTE` … `VINNOT`); dates are ISO-8601 instants.
 */
export interface UserPointsDto {
  points: number
  tier: string
  nextTier: string | null
  nextTierAt: number | null
  tierFloor: number
  todayEarned: number
  dailyCap: number
  pendingCelebration: string | null
  showWelcome: boolean
  recent: UserPointsEntryDto[]
}

/** One points movement; revocations are negative entries. */
export interface UserPointsEntryDto {
  id: string
  source: string
  points: number
  createdAt: string
  /** Related wine or event name, when there is one. */
  label: string | null
}

/**
 * POST /users/me/points/celebrations: `{ tier }` marks that tier (and any lower)
 * as celebrated; `{ welcome: true }` dismisses the welcome card.
 */
export type PointsAcknowledgementRequestDto = { tier: string } | { welcome: true }



/**
 * Update user request
 * Note: field names must match backend's UpdateProfileRequest (camelCase)
 */
export interface UpdateUserRequestDto {
  phoneNumber?: string | null
  username?: string
  firstName?: string
  lastName?: string
  name?: string
}

export interface RequestEmailChangeDto {
  newEmail: string
}

export interface DeleteOwnAccountDto {
  appleAuthorizationCode?: string
  appleClientId?: string
  appleRedirectUri?: string
}

export interface CompleteUserOnboardingRequestDto {
  username?: string
}

/**
 * PATCH /users/me/preferences. Omitted fields keep their stored value.
 */
export interface UpdateUserPreferencesRequestDto {
  preferredLanguage?: 'es' | 'en'
  /** IANA time zone, for example "Europe/Madrid". */
  timezone?: string
}

/**
 * Change password request
 */
export interface ChangePasswordRequestDto {
  current_password: string
  new_password: string
}

/**
 * User filter/search parameters (admin)
 */
export interface UserFilterParamsDto {
  search?: string
  role?: UserRoleDto | UserRoleDto[]
  is_verified?: boolean
  is_active?: boolean
  created_after?: string
  created_before?: string
  sort_by?: 'name' | 'email' | 'created_at' | 'last_login_at'
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}



/**
 * Paginated users response
 */
export interface UsersPageResponseDto {
  data: UserDto[]
  pagination: {
    page: number
    page_size: number
    total_items: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
  }
}

/**
 * User activity item
 */
export interface UserActivityDto {
  id: string
  type: 'review' | 'event_registration' | 'route_completed' | 'wine_added' | 'follow'
  description: string
  target_id?: string
  target_name?: string
  created_at: string
}
