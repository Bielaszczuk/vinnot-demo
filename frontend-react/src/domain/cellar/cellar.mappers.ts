/**
 * Cellar domain mappers
 *
 * Functions to map between DTOs (API layer) and domain models.
 * Includes null checks and default values for safety.
 */

import type { Wine } from '@domain/wine/wine.types'
import type { CellarWine } from './cellar.types'

type CellarEntryInput = {
  id: string
  wine?: Record<string, unknown> | null
  rating?: number | null
  purchasePrice?: number | null
  reviewId?: string | null
  notes?: string | null
  vintage?: number | null
  addedAt: string
}

/**
 * Map a raw wine object from the cellar API response to a Wine domain model.
 * The cellar endpoint returns wine data in a flat structure that differs
 * from the standard wine DTO, so this mapper handles that shape.
 */
export function mapCellarApiWineToWine(w: Record<string, unknown>): Wine {
  return {
    id: w.id as string,
    name: w.name as string,
    winery: (w.wineryName as string) ?? '',
    wineryId: (w.wineryId as string | null) ?? null,
    type: (w.wineType as Wine['type']) ?? 'RED',
    region: (w.region as string) ?? '',
    country: (w.country as string) ?? '',
    grapeVarieties: (w.grapes as string[]) ?? [],
    vintage: (w.vintage as number | null) ?? null,
    alcoholContent: null,
    style: (w.style as string | null) ?? null,
    allergens: [],
    price: (w.priceMin as number | null) ?? null,
    rating: w.ratingAverage ? Number(w.ratingAverage) : null,
    reviewCount: 0,
    description: '',
    imageUrl: (w.imageUrl as string | null) ?? null,
    tastingNotes: null,
    foodPairings: [],
    awards: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isNatural: (w.isNatural as boolean) ?? false,
    bottleImageUrl: (w.bottleImageUrl as string | null) ?? null,
    externalUrl: (w.externalUrl as string | null) ?? null,
    foodPairing: (w.foodPairing as string | null) ?? null,
    seoName: (w.seoName as string | null) ?? null,
    bestVintageYear: (w.bestVintageYear as number | null) ?? null,
    bestVintageRating: (w.bestVintageRating as number | null) ?? null,
    regionId: (w.regionId as string | null) ?? null,
    regionName: (w.regionName as string | null) ?? null,
    countryId: (w.countryId as string | null) ?? null,
    countryName: (w.countryName as string | null) ?? null,
    acidityScore: (w.acidityScore as number | null) ?? null,
    tanninScore: (w.tanninScore as number | null) ?? null,
    bodyScore: (w.bodyScore as number | null) ?? null,
    sweetnessScore: (w.sweetnessScore as number | null) ?? null,
  }
}

/**
 * Map a cellar entry DTO to a CellarWine domain model.
 */
export function mapCellarEntryFromDto(dto: CellarEntryInput): CellarWine {
  return {
    id: dto.id,
    reviewId: dto.reviewId ?? null,
    wine: mapCellarApiWineToWine(dto.wine ?? {}),
    rating: dto.rating ?? null,
    purchasePrice: dto.purchasePrice ?? null,
    notes: dto.notes ?? null,
    vintage: dto.vintage ?? null,
    addedAt: new Date(dto.addedAt),
  }
}

/**
 * Map a cellar entry DTO to a CellarWine domain model,
 * using a fallback Wine when the DTO wine data is missing.
 */
export function mapCellarEntryFromDtoWithFallback(dto: CellarEntryInput, fallbackWine: Wine): CellarWine {
  return {
    id: dto.id,
    reviewId: dto.reviewId ?? null,
    wine: dto.wine ? mapCellarApiWineToWine(dto.wine) : fallbackWine,
    rating: dto.rating ?? null,
    purchasePrice: dto.purchasePrice ?? null,
    notes: dto.notes ?? null,
    vintage: dto.vintage ?? null,
    addedAt: new Date(dto.addedAt),
  }
}
