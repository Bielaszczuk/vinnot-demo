/**
 * User domain types
 */
import type { BadgeTier } from '@domain/points/points.types'
import type { CellarVisibility, TasteTraits, TasteWheelEntry } from '@domain/social/social.types'

/**
 * User roles matching the RBAC system
 */
export type UserRole = 'ROLE_ADMIN' | 'ROLE_MODERATOR' | 'ROLE_PARTNER' | 'ROLE_USER'
export type SocialProvider = 'APPLE' | 'FACEBOOK' | 'GOOGLE'

export interface User {
  /** Private, unverified contact; only exposed to the owner and authorized administration. */
  phoneNumber?: string | null
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  name: string
  avatar: string | null
  roles: UserRole[]
  preferences: UserPreferences
  isVerified: boolean
  hasSocialIdentity: boolean
  /** The account can sign in with a password, even when a social identity is linked. */
  hasPassword: boolean
  socialProviders: SocialProvider[]
  onboardingCompleted: boolean
  /** Public bio (max 160 characters); absent on older APIs. */
  bio?: string | null
  /** Who can see the user's cellar; absent on older APIs (public). */
  cellarVisibility?: CellarVisibility
  createdAt: Date
  updatedAt: Date
}


export interface UserPreferences {
  favoriteWineTypes: string[]
  favoriteRegions: string[]
  priceRange: PriceRange | null
  notifications: NotificationPreferences
  locale: string
  theme: 'light' | 'dark' | 'system'
}

export interface PriceRange {
  min: number
  max: number
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  events: boolean
  recommendations: boolean
  newsletter: boolean
}

/** Public profile of any user as the viewer sees it (GET /users/{id}/profile). */
export interface UserProfile {
  id: string
  username: string
  displayName: string
  avatar: string | null
  joinedAt: Date
  bio: string | null
  /** Current wax-seal tier; `null` hides the seal. */
  tier: BadgeTier | null
  followersCount: number
  followingCount: number
  reviewsCount: number
  /** `null` when the cellar is not visible to the viewer. */
  cellarCount: number | null
  cellarVisible: boolean
  /** The viewer follows this user. */
  following: boolean
  /** This user follows the viewer. */
  followsYou: boolean
  /** Taste match with the viewer (0-100); `null` for self or under 5 rated wines on either side. */
  affinityPercent: number | null
  /** `null` while the user has rated fewer than 5 wines. */
  tasteWheel: TasteWheelEntry[] | null
  /** Structure scales and preferred aroma families; `null` under the same 5-rated-wines threshold as the wheel. */
  tasteTraits: TasteTraits | null
}

export interface UserStats {
  totalReviews: number
  totalWinesTasted: number
  totalEventsAttended: number
  totalRoutesCompleted: number
  cellarSize: number
  averageRating: number
}
