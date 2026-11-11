import { parseBadgeTier } from '@domain/points/points.tiers'
import {
  CELLAR_VISIBILITIES,
  TASTE_FAMILIES,
  TASTE_TRAITS,
  TASTE_WHEEL_KINDS,
  type CellarVisibility,
  type PublicCellarWine,
  type SocialPage,
  type SocialReview,
  type SocialReviewer,
  type SocialUser,
  type SocialWine,
  type SuggestedUser,
  type TasteFamily,
  type TasteFamilyKey,
  type TasteTrait,
  type TasteTraitKey,
  type TasteTraits,
  type TasteWheelEntry,
  type TasteWheelKind,
} from './social.types'

type ReviewerInput = {
  id: string
  username: string
  displayName?: string | null
  avatarUrl?: string | null
  tier?: string | null
}

type SocialUserInput = ReviewerInput & { following?: boolean | null }

type SuggestedUserInput = ReviewerInput & {
  affinityPercent?: number | null
  reviewsCount?: number | null
}

type SocialWineInput = {
  id: string
  name: string
  imageUrl?: string | null
  type?: string | null
  wineryName?: string | null
}

type SocialReviewInput = {
  reviewId: string
  rating: number
  title?: string | null
  comment?: string | null
  vintage?: number | null
  createdAt: string
  reviewer: ReviewerInput
  wine: SocialWineInput
}

type PublicCellarWineInput = {
  id: string
  wine: SocialWineInput
  vintage?: number | null
  rating?: number | null
  addedAt: string
}

type TasteWheelInput = {
  kind: string
  value: string
  label: string
  score: number
  tone?: string | null
  ratedWines?: number | null
}

type TasteTraitsInput = {
  structure?: { trait: string; score: number; wines: number; adjusted?: boolean | null }[] | null
  families?: { family: string; percent: number }[] | null
  fromQuiz?: boolean | null
}

type SocialPageInput<T> = {
  content: T[]
  page: number
  totalItems: number
  totalPages: number
}

function displayName(raw: ReviewerInput): string {
  return raw.displayName?.trim() || raw.username
}

function mapReviewer(raw: ReviewerInput): SocialReviewer {
  return {
    id: raw.id,
    username: raw.username,
    displayName: displayName(raw),
    avatarUrl: raw.avatarUrl ?? null,
    tier: parseBadgeTier(raw.tier),
  }
}

export function mapSocialUser(raw: SocialUserInput): SocialUser {
  return { ...mapReviewer(raw), following: raw.following ?? false }
}

export function mapSuggestedUser(raw: SuggestedUserInput): SuggestedUser {
  return {
    ...mapReviewer(raw),
    following: false,
    affinityPercent: raw.affinityPercent ?? null,
    reviewsCount: raw.reviewsCount ?? 0,
  }
}

export function mapSocialWine(raw: SocialWineInput): SocialWine {
  return {
    id: raw.id,
    name: raw.name,
    imageUrl: raw.imageUrl ?? null,
    type: raw.type ?? null,
    wineryName: raw.wineryName ?? null,
  }
}

export function mapSocialReview(raw: SocialReviewInput): SocialReview {
  return {
    id: raw.reviewId,
    rating: raw.rating,
    title: raw.title ?? null,
    comment: raw.comment ?? null,
    vintage: raw.vintage ?? null,
    createdAt: new Date(raw.createdAt),
    reviewer: mapReviewer(raw.reviewer),
    wine: mapSocialWine(raw.wine),
  }
}

/** Copies only the public fields, so private notes or prices can never leak into the view. */
export function mapPublicCellarWine(raw: PublicCellarWineInput): PublicCellarWine {
  return {
    id: raw.id,
    wine: mapSocialWine(raw.wine),
    vintage: raw.vintage ?? null,
    rating: raw.rating ?? null,
    addedAt: new Date(raw.addedAt),
  }
}

function isTasteWheelKind(value: string): value is TasteWheelKind {
  return (TASTE_WHEEL_KINDS as readonly string[]).includes(value)
}

/**
 * `null` means the user has rated fewer than 5 wines and the wheel stays hidden. Unknown kinds are dropped;
 * an older payload without `tone` or `ratedWines` maps to `null` and 0.
 */
export function mapTasteWheel(raw: TasteWheelInput[] | null | undefined): TasteWheelEntry[] | null {
  if (!raw) return null
  return raw.flatMap((entry) =>
    isTasteWheelKind(entry.kind)
      ? [{
          kind: entry.kind,
          value: entry.value,
          label: entry.label,
          score: Math.min(5, Math.max(0, entry.score)),
          tone: entry.tone?.trim() ? entry.tone.trim() : null,
          ratedWines: Math.max(0, Math.round(entry.ratedWines ?? 0)),
        }]
      : [],
  )
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function isTraitKey(value: string): value is TasteTraitKey {
  return (TASTE_TRAITS as readonly string[]).includes(value)
}

function isFamilyKey(value: string): value is TasteFamilyKey {
  return (TASTE_FAMILIES as readonly string[]).includes(value)
}

/**
 * `null` means the user has rated fewer than 5 wines and has no taste quiz. Unknown traits or families from a newer API are dropped;
 * the structure keeps the profile's axis order and the families run from the largest share down.
 */
export function mapTasteTraits(raw: TasteTraitsInput | null | undefined): TasteTraits | null {
  if (!raw) return null
  const structure: TasteTrait[] = (raw.structure ?? [])
    .flatMap((entry) => (isTraitKey(entry.trait)
      ? [{ trait: entry.trait, score: clampPercent(entry.score), wines: entry.wines, adjusted: entry.adjusted ?? false }]
      : []))
    .sort((a, b) => TASTE_TRAITS.indexOf(a.trait) - TASTE_TRAITS.indexOf(b.trait))
  const families: TasteFamily[] = (raw.families ?? [])
    .flatMap((entry) => (isFamilyKey(entry.family) ? [{ family: entry.family, percent: clampPercent(entry.percent) }] : []))
    .filter((entry) => entry.percent > 0)
    .sort((a, b) => b.percent - a.percent)
  return { structure, families, fromQuiz: raw.fromQuiz ?? false }
}

export function mapSocialPage<T, U>(raw: SocialPageInput<T>, map: (item: T) => U): SocialPage<U> {
  return {
    items: raw.content.map(map),
    page: raw.page,
    totalItems: raw.totalItems,
    totalPages: raw.totalPages,
  }
}

export function parseCellarVisibility(value: unknown): CellarVisibility {
  return CELLAR_VISIBILITIES.includes(value as CellarVisibility) ? (value as CellarVisibility) : 'PUBLIC'
}
