/**
 * Social domain types: follows, public profiles, the following feed and the public cellar.
 * Framework-agnostic; DTOs are mapped into these shapes by the application services.
 */
import type { BadgeTier } from '@domain/points/points.types'

export const CELLAR_VISIBILITIES = ['PUBLIC', 'FOLLOWERS', 'PRIVATE'] as const
/** Who can see a user's cellar; private notes and purchase prices are never shown to anyone else. */
export type CellarVisibility = (typeof CELLAR_VISIBILITIES)[number]

/** A user row in followers, following and other people lists. */
export interface SocialUser {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  tier: BadgeTier | null
  /** The viewer follows this user. */
  following: boolean
}

/** A person suggested to follow, ranked by taste affinity. */
export interface SuggestedUser extends SocialUser {
  affinityPercent: number | null
  reviewsCount: number
}

export interface SocialWine {
  id: string
  name: string
  imageUrl: string | null
  type: string | null
  wineryName: string | null
}

/** The author of a review shown in the feed or on a profile. */
export interface SocialReviewer {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  tier: BadgeTier | null
}

/** An approved review in the following feed or on a public profile. */
export interface SocialReview {
  id: string
  rating: number
  title: string | null
  comment: string | null
  vintage: number | null
  createdAt: Date
  reviewer: SocialReviewer
  wine: SocialWine
}

/** A wine of someone else's cellar; it never carries notes or the purchase price. */
export interface PublicCellarWine {
  id: string
  wine: SocialWine
  vintage: number | null
  rating: number | null
  addedAt: Date
}

/** The views of the taste wheel, in the order the selector offers them: grapes first. */
export const TASTE_WHEEL_KINDS = ['GRAPE', 'TYPE', 'REGION'] as const
export type TasteWheelKind = (typeof TASTE_WHEEL_KINDS)[number]

/** One axis of the taste wheel: a grape, a wine type or a region with a score from 0 to 5. */
export interface TasteWheelEntry {
  kind: TasteWheelKind
  value: string
  label: string
  score: number
  /**
   * The wine type behind the axis: the type itself for TYPE, the dominant type of the member's rated wines
   * with that grape for GRAPE (RED, WHITE, ROSE…), and `null` for REGION or when the server does not send it.
   */
  tone: string | null
  /** How many of the member's rated wines count for the axis; 0 when the server does not send it. */
  ratedWines: number
}

/** The structure axes of a taste profile, in the order the profile shows them. */
export const TASTE_TRAITS = ['ACIDITY', 'BODY', 'TANNIN', 'SWEETNESS'] as const
export type TasteTraitKey = (typeof TASTE_TRAITS)[number]

/** The aroma families of a taste profile. */
export const TASTE_FAMILIES = ['FRUIT', 'FLORAL', 'HERBAL', 'SPICE', 'OAK', 'MINERAL'] as const
export type TasteFamilyKey = (typeof TASTE_FAMILIES)[number]

/** How much of a trait the liked wines carry, from a 0-100 score. */
export type TasteLevel = 'LOW' | 'MEDIUM' | 'HIGH'

/**
 * One structure axis: the rating-weighted score (0-100) of the liked wines that have data for it, or the
 * score the member set by hand, which wins.
 */
export interface TasteTrait {
  trait: TasteTraitKey
  score: number
  /** Liked wines with data for this trait. */
  wines: number
  /** The member set this score by hand. */
  adjusted: boolean
}

/** Hand-set structure scores to save: a 0-100 score sets the trait, `null` clears it. Traits left out stay as they are. */
export type TasteStructureChanges = Partial<Record<TasteTraitKey, number | null>>

/** One aroma family and its share (1-100) of the liked wines. */
export interface TasteFamily {
  family: TasteFamilyKey
  percent: number
}

/** The taste profile beyond the wheel: structure scales and preferred aroma families. Either list may be empty. */
export interface TasteTraits {
  structure: TasteTrait[]
  families: TasteFamily[]
  /** Some value comes from the member's taste quiz because their ratings do not cover it yet. */
  fromQuiz: boolean
}

export interface SocialPage<T> {
  items: T[]
  /** Zero-based page index. */
  page: number
  totalItems: number
  totalPages: number
}

/** A public cellar the viewer may see, or the locked state when the owner hides it from them. */
export type PublicCellar =
  | { visible: true; page: SocialPage<PublicCellarWine> }
  | { visible: false }
