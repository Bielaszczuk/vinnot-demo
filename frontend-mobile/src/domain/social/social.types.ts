/**
 * Social domain: follows, public profiles, the following feed and suggestions.
 * @contract: backend community follows and GET /users/{id}/profile (issue #541, S7; tasteTraits S9;
 * wheel views, tone and ratedWines S15).
 */
import type { BadgeTier } from "@/domain/points/badgeTiers";
import type { WineType } from "@/domain/wine/wine.types";

/** Who can see a user's cellar. PUBLIC is the default. */
export const CELLAR_VISIBILITIES = ["PUBLIC", "FOLLOWERS", "PRIVATE"] as const;
export type CellarVisibility = (typeof CELLAR_VISIBILITIES)[number];
export const DEFAULT_CELLAR_VISIBILITY: CellarVisibility = "PUBLIC";

/** Longest bio the backend accepts. */
export const BIO_MAX_LENGTH = 160;
/** Rated wines a user needs before the taste wheel and the affinity appear. */
export const TASTE_WHEEL_MIN_RATED_WINES = 5;
/** Highest taste score on the wheel. */
export const TASTE_SCORE_MAX = 5;

/** The backend error when the viewer may not see a cellar. */
export const CELLAR_NOT_VISIBLE = "CELLAR_NOT_VISIBLE";

export interface SocialUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  tier: BadgeTier | null;
}

/** A row of a followers or following list. */
export interface FollowUser extends SocialUser {
  /** Whether the viewer follows this person. */
  following: boolean;
}

export interface SuggestedUser extends SocialUser {
  affinityPercent: number | null;
  reviewsCount: number;
}

/** The taste wheel's views, in the order the selector shows them; grapes come first. */
export const TASTE_WHEEL_VIEWS = ["GRAPE", "TYPE", "REGION"] as const;
export type TasteKind = (typeof TASTE_WHEEL_VIEWS)[number];

export interface TasteSlice {
  kind: TasteKind;
  value: string;
  /** As sent for grapes and regions; a wine style is named from its code instead. */
  label: string;
  /** 0 to 5. */
  score: number;
  /**
   * Wine type code that colours the slice: the style itself, or the dominant type of the
   * member's rated wines with that grape. Null for regions and older payloads.
   */
  tone: string | null;
  /** Rated wines behind the slice; 0 on older payloads. */
  ratedWines: number;
}

/** Structure traits of the taste profile, in contract order. */
export const TASTE_TRAITS = ["ACIDITY", "BODY", "TANNIN", "SWEETNESS"] as const;
export type TasteTrait = (typeof TASTE_TRAITS)[number];

/** Aroma families of the taste profile. */
export const TASTE_FAMILIES = ["FRUIT", "FLORAL", "HERBAL", "SPICE", "OAK", "MINERAL"] as const;
export type TasteFamily = (typeof TASTE_FAMILIES)[number];

/** Highest structure score and family share. */
export const TASTE_TRAIT_MAX = 100;

/** Word for a structure score: under 34 low, under 67 medium, otherwise high. */
export type TasteTraitLevel = "LOW" | "MEDIUM" | "HIGH";

export interface TasteTraitScore {
  trait: TasteTrait;
  /** 0 to 100, rating-weighted over the liked wines with data. */
  score: number;
  /** Liked wines with data for this trait. */
  wines: number;
  /** Set by the member by hand; a manual value wins over the calculated one. */
  adjusted: boolean;
}

/** Manual structure values to save: a number sets the trait (0-100), null clears it. */
export type TasteStructureAdjustment = Partial<Record<TasteTrait, number | null>>;

/** Where a trait starts in the editor when the profile has no value for it yet. */
export const TASTE_TRAIT_DEFAULT = 50;

export interface TasteFamilyShare {
  family: TasteFamily;
  /** 1 to 100: share of the liked wines with a note of this family. */
  percent: number;
}

export interface TasteTraits {
  /** Contract order; a trait without enough data is missing. */
  structure: TasteTraitScore[];
  /** Highest share first. */
  families: TasteFamilyShare[];
  /** Some value comes from the member's taste quiz instead of rated wines. */
  fromQuiz: boolean;
}

/** Illustrations drawn for the taste profile itself (the rest reuse note art). */
export const TASTE_ART_KEYS = [
  "BODY",
  "TANNIN",
  "GRAPE_CLUSTER",
  "WINE_GLASSES",
  "VINEYARD",
  "WEDGE_WASH_1",
  "WEDGE_WASH_2",
  "WEDGE_WASH_3",
] as const;
export type TasteArt = (typeof TASTE_ART_KEYS)[number];

export interface PublicProfile extends SocialUser {
  bio: string | null;
  createdAt: Date;
  followersCount: number;
  followingCount: number;
  reviewsCount: number;
  /** Null when the cellar is not visible to the viewer. */
  cellarCount: number | null;
  cellarVisible: boolean;
  following: boolean;
  followsYou: boolean;
  /** Null for one's own profile or when either user has fewer than 5 rated wines. */
  affinityPercent: number | null;
  /** Null under 5 rated wines. */
  tasteWheel: TasteSlice[] | null;
  /**
   * Null under 5 rated wines unless the member completed the taste quiz; either list may be
   * empty. With a quiz below the threshold there are traits but no wheel.
   */
  tasteTraits: TasteTraits | null;
}

export interface SocialWine {
  id: string;
  name: string;
  imageUrl: string | null;
  type: WineType | null;
  wineryName: string | null;
}

export interface UserReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  vintage: number | null;
  createdAt: Date;
  reviewer: SocialUser;
  wine: SocialWine;
}

/** A wine of someone else's cellar: never notes or purchase price. */
export interface PublicCellarWine {
  id: string;
  wine: SocialWine;
  vintage: number | null;
  rating: number | null;
  addedAt: Date;
}

export interface SocialPage<T> {
  items: T[];
  page: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}
