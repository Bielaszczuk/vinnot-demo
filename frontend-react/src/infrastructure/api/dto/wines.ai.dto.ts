import type { TastingNotesDto } from './wines.base.dto'

export interface AiProfileDto {
  wineId: string
  language: string
  profileContent: AiProfileContentDto
  /** Main hue of the visual color line, e.g. RED_GARNET; null when the line names no hue. */
  visualColorTone?: string | null
  /** Depth of the color line's core: PALE, MEDIUM or DEEP; null when the line names none. */
  visualColorIntensity?: string | null
  /** Rim tone of the visual color line, e.g. RED_TAWNY; null when the line names no other tone. */
  visualRimTone?: string | null
  visualHighlights?: boolean
  visualReflectionTones?: string[]
  /** Illustrations named from the profile text, computed on read; absent from older responses. */
  profileArt?: AiProfileArtDto | null
  cached: boolean
  generatedAt: string
}

export interface AiProfileArtItemDto {
  label: string
  /** Taxonomy key, e.g. RASPBERRY or POULTRY. */
  art: string
}

export interface AiProfileArtDto {
  aromas?: AiProfileArtItemDto[]
  flavors?: AiProfileArtItemDto[]
  pairings?: AiProfileArtItemDto[]
  serving?: {
    glass?: string | null
    decant?: boolean
    temperature?: { min: number; max: number } | null
  } | null
}

export interface AiProfileStatusDto {
  status: 'NOT_REQUESTED' | 'GENERATED' | string
  generatedAt?: string | null
}

export interface AiProfileContentDto {
  summary?: string
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
  foodPairings?:
    | string[]
    | {
        pairings: string[]
        explanation?: string
      }
  servingRecommendations?: {
    temperature: string
    glassware: string
    decanting: string
    agingPotential: string
  }
  tastingNotes?: TastingNotesDto | string
  sensoryProfile?: {
    color?: string
    intensity?: string
    body?: string
    sweetness?: string
    acidity?: string
    tannin?: string
    alcohol?: string
    complexity?: string
  }
  idealOccasions?: string[]
  similarWines?: string[]
  funFacts?: string[]
}
