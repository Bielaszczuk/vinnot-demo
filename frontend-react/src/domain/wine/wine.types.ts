import type { WineColorIntensity, WineColorTone } from "./wine.color-tone"
import type { ProfileArt } from "./wine.profile-art"
/**
 * Wine domain types
 *
 * These are the domain models used throughout the application.
 * They represent the canonical shape of data after mapping from DTOs.
 */

import type { BadgeTier } from '@domain/points/points.types'



export interface WineProfileOverview {
  summary: string | null;
  acidityScore: number | null;
  tanninScore: number | null;
  bodyScore: number | null;
  sweetnessScore: number | null;
  foodPairings: string[];
}

export interface Wine {
  profileOverview?: Partial<Record<"es" | "en", WineProfileOverview>>;
  catalogDescriptions?: { es?: string | null; en?: string | null };
  id: string
  name: string
  winery: string
  wineryId: string | null
  type: WineType
  region: string
  country: string
  grapeVarieties: string[]
  vintage: number | null
  alcoholContent: number | null
  style: string | null
  allergens: string[]
  price: number | null
  rating: number | null
  reviewCount: number
  description: string
  imageUrl: string | null
  tastingNotes: TastingNotes | null
  foodPairings: string[]
  awards: WineAward[]
  createdAt: Date
  updatedAt: Date
  isNatural: boolean
  bottleImageUrl: string | null
  externalUrl: string | null
  foodPairing: string | null
  seoName: string | null
  bestVintageYear: number | null
  bestVintageRating: number | null
  regionId: string | null
  regionName: string | null
  countryId: string | null
  countryName: string | null
  acidityScore: number | null
  tanninScore: number | null
  bodyScore: number | null
  sweetnessScore: number | null
}

/**
 * Wine summary for list views (lighter than full Wine)
 */
export interface WineSummary {
  id: string
  name: string
  winery: string
  type: WineType
  region: string
  country: string
  grapeVarieties: string[]
  vintage: number | null
  price: number | null
  rating: number | null
  reviewCount: number
  imageUrl: string | null
  isNatural: boolean
  bottleImageUrl: string | null
  seoName: string | null
}

export type WineType = 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'orange'

const KNOWN_WINE_TYPES: readonly WineType[] = ['red', 'white', 'rose', 'sparkling', 'dessert', 'fortified', 'orange']

/** Normalizes a wine type as the API sends it (`RED`, `ROSE`, …) or as a filter value; null when unknown. */
export function toWineType(code: string | null | undefined): WineType | null {
  const normalized = code?.trim().toLowerCase() as WineType | undefined
  return normalized && KNOWN_WINE_TYPES.includes(normalized) ? normalized : null
}

/** A wine type offered by the reference catalog (`code` is the API value, `value` the filter value). */
export interface WineTypeOption {
  code: string
  value: WineType
  names: { es: string; en: string }
}



export interface TastingNotes {
  appearance: string
  aroma: string[]
  palate: string[]
  finish: string
  body: WineBody
  sweetness: WineSweetness
  tannins: WineLevel
  acidity: WineLevel
}

export type WineBody = 'light' | 'medium' | 'full'
export type WineSweetness = 'dry' | 'off-dry' | 'medium-sweet' | 'sweet'
export type WineLevel = 'low' | 'medium' | 'high'



export interface WineAward {
  name: string
  year: number
  medal: 'gold' | 'silver' | 'bronze' | null
}



export interface WineReview {
  publicationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  id: string
  wineId: string
  userId: string
  userName: string
  userAvatar: string | null
  rating: number
  /** Vintage the reviewer tasted; independent from the catalog wine vintage. */
  vintage: number | null
  title: string | null
  comment: string | null
  likesCount: number
  commentsCount: number
  likedByCurrentUser: boolean
  helpfulCount: number
  reviewer: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    totalReviews: number
    /** Wax-seal tier shown after the name; `null` hides the emblem. */
    badgeTier?: BadgeTier | null
  } | null
  createdAt: Date
  updatedAt: Date
}

export interface WineReviewComment {
  publicationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  id: string
  reviewId: string
  content: string
  createdAt: Date
  updatedAt: Date
  reviewer: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    /** Wax-seal tier shown after the name; `null` hides the emblem. */
    badgeTier?: BadgeTier | null
  } | null
}



export interface WineFilter {
  search?: string
  type?: WineType | WineType[]
  region?: string | string[]
  country?: string | string[]
  grapeVariety?: string | string[]
  winery?: string | string[]
  minPrice?: number
  maxPrice?: number
  minRating?: number
  maxRating?: number
  vintage?: number | number[]
  minVintage?: number
  maxVintage?: number
  sortBy?: 'name' | 'price' | 'rating' | 'vintage' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}



export interface WineComparison {
  wines: Wine[]
  attributes: ComparisonAttribute[]
  aiSummary: string | null

  summary?: string
  similarities?: string[]
  keyDifferences?: string[]
  differences?: string[]
  attributeComparison?: {
    attributes: Array<{
      key?: ComparisonAttributeKey
      name: string
      wineAValue: string
      wineBValue: string
      wineAScore?: number
      wineBScore?: number
    }>
  }
  bestFor?: {
    wineA: string[]
    wineB: string[]
  }
  recommendation?: string
  recommendationWineA?: string
  recommendationWineB?: string
  /** Per-wine tasting notes; a side is null when the AI sent nothing usable for it. */
  tastingNotes?: ComparisonPair<ComparisonTastingNote | null>
  chooseIf?: ComparisonChooseIf[]
  pairings?: ComparisonPairings
  serving?: ComparisonPair<ComparisonServing | null>
  /** Drinking window per wine. */
  aging?: ComparisonPair<string | null>
  /** Value-for-money note, present only when a catalog price exists. */
  value?: string
  fromCache?: boolean
}

export const COMPARISON_ATTRIBUTE_KEYS = [
  'body', 'tannin', 'acidity', 'sweetness', 'alcohol', 'fruitIntensity', 'complexity', 'finish',
] as const

export type ComparisonAttributeKey = typeof COMPARISON_ATTRIBUTE_KEYS[number]

export type ComparisonPick = 'A' | 'B'

export interface ComparisonPair<T> {
  wineA: T
  wineB: T
}

export interface ComparisonTastingNote {
  /** One sentence naming the anchor that sets the wine apart. */
  identity?: string
  appearance?: string
  nose?: string
  palate?: string
  finish?: string
}

export interface ComparisonChooseIf {
  pick: ComparisonPick
  situation: string
  why?: string
}

export interface ComparisonPairing {
  dish: string
  why?: string
}

export interface ComparisonPairings extends ComparisonPair<ComparisonPairing[]> {
  shared: ComparisonPairing | null
}

export interface ComparisonServing {
  temperature?: string
  decanting?: string
}

export interface ComparisonAttribute {
  name: string
  values: (string | number | null)[]
  winnerIndex: number | null
}



export interface AiWineProfile {
  wineId: string
  summary: string
  /** Main hue of the visual color line; null when the line names no hue. */
  visualColorTone?: WineColorTone | null
  /** Depth of the color line's core; null when the line names none. */
  visualColorIntensity?: WineColorIntensity | null
  /** Rim tone of the visual color line; null when the line names no other tone. */
  visualRimTone?: WineColorTone | null
  /** The color line names reflections, glints or a rim: the stroke edges turn to that tone and back. */
  visualHighlights?: boolean
  /** Every reflection tone the color line names, in order. */
  visualReflectionTones?: WineColorTone[]
  /** Illustrations named from the profile text; null when the response carries none. */
  profileArt?: ProfileArt | null
  visualAnalysis?: {
    color: string
    clarity: string
    intensity: string
    viscosity: string
  }
  aromaticProfile?: {
    intensity: string
    primaryAromas: string[]
    secondaryAromas?: string[]
    bouquet: string
  }
  palateAnalysis?: {
    sweetness: string
    sweetnessScore?: number
    acidity: string
    acidityScore?: number
    tannin: string
    tanninScore?: number
    alcohol: string
    body: string
    bodyScore?: number
    texture: string
    balance: string
  }
  flavorProfile?: {
    primaryFlavors: string[]
    secondaryFlavors?: string[]
    intensity: string
    finish: string
  }
  foodPairings?: {
    pairings: string[]
    explanation?: string
  }
  servingRecommendations?: {
    temperature: string
    glassware: string
    decanting: string
    agingPotential: string
  }
  generatedAt: Date
  fromCache?: boolean

  idealOccasions?: string[]
  foodPairingsDetailed?: AiFoodPairing[]
  similarWines?: string[]
  personalityTraits?: string[]
}

export interface AiProfileStatus {
  status: 'NOT_GENERATED' | 'PENDING' | 'GENERATING' | 'READY' | 'FAILED'
  generatedAt: string | null
}

export interface AiFoodPairing {
  dish: string
  category: string
  matchScore: number
  reason: string
}



export interface WineScanResult {
  confidence: number
  wine: WineSummary | null
  suggestions: WineSummary[]
  extractedData: ExtractedLabelData | null
}

export interface ExtractedLabelData {
  wineryName: string | null
  wineName: string | null
  grapeVariety: string | null
  vintage: number | null
  wineType: string | null
  region: string | null
  country: string | null
  alcoholContent: string | null
  confidence: number
  searchKeywords: string | null
  visualDescription: string | null
}
