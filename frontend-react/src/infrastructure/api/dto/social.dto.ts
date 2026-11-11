/**
 * Social DTOs: follows, people lists, suggestions, the following feed and the public cellar.
 * Exact backend shapes (camelCase) of the community and users social endpoints.
 */

export type CellarVisibilityDto = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'

/** GET /community/users/{id}/followers and /following rows. */
export interface FollowUserDto {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  tier: string | null
  /** The viewer follows this user. */
  following: boolean
}

/** GET /community/suggestions rows. */
export interface SuggestedUserDto {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  tier: string | null
  affinityPercent: number | null
  reviewsCount: number
}

export interface SocialWineDto {
  id: string
  name: string
  imageUrl: string | null
  type: string | null
  wineryName: string | null
}

export interface SocialReviewerDto {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  tier: string | null
}

/** GET /community/feed and GET /users/{id}/reviews rows (UserReviewResponse). */
export interface UserReviewDto {
  reviewId: string
  rating: number
  title: string | null
  comment: string | null
  vintage: number | null
  createdAt: string
  reviewer: SocialReviewerDto
  wine: SocialWineDto
}

/** GET /users/{id}/cellar rows; never carries notes or the purchase price. */
export interface PublicCellarWineDto {
  id: string
  wine: SocialWineDto
  vintage: number | null
  rating: number | null
  addedAt: string
}

export interface TasteWheelEntryDto {
  kind: 'GRAPE' | 'TYPE' | 'REGION'
  value: string
  label: string
  /** 0-5. */
  score: number
  /** TYPE: the type code; GRAPE: the dominant wine type of the member's rated wines with that grape; REGION: null. Older servers omit it. */
  tone?: string | null
  /** Rated wines behind the axis. Older servers omit it. */
  ratedWines?: number
}

/**
 * GET /users/{id}/profile `tasteTraits`; either list may be empty and a trait may be missing.
 * Present from 5 rated wines, or earlier when the member completed the taste quiz.
 */
export interface TasteTraitsDto {
  structure: {
    trait: 'ACIDITY' | 'BODY' | 'TANNIN' | 'SWEETNESS'
    /** 0-100, rating-weighted. */
    score: number
    /** Liked wines with data for this trait. */
    wines: number
    /** The member set this score by hand; a hand-set score wins over the calculated one. */
    adjusted?: boolean
  }[]
  families: {
    family: 'FRUIT' | 'FLORAL' | 'HERBAL' | 'SPICE' | 'OAK' | 'MINERAL'
    /** 1-100, sorted from the largest share down. */
    percent: number
  }[]
  /** True when any value comes from the member's taste quiz (their ratings do not cover it yet). */
  fromQuiz: boolean
}

/**
 * PUT /users/me/taste-traits body. Partial: a 0-100 score sets the trait, `null` clears it, a missing trait
 * stays as it is. 204; 400 INVALID_TASTE_ADJUSTMENT on an unknown trait or a score out of range.
 */
export interface AdjustTasteTraitsRequestDto {
  structure: Partial<Record<TasteTraitsDto['structure'][number]['trait'], number | null>>
}

/** A backend PageResult normalized by the client. */
export interface SocialPageDto<T> {
  content: T[]
  page: number
  totalItems: number
  totalPages: number
}
