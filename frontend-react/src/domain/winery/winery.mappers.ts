/**
 * Winery domain mappers — DTO → domain model transformations.
 */

import type { Winery, WinerySummary } from './winery.types'

type WinerySummaryInput = {
  id: string
  name: string
  slug?: string | null
  countryName?: string | null
  regionName?: string | null
  logoUrl?: string | null
  imageUrl?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
}

type WineryDetailsInput = WinerySummaryInput & {
  descriptionEs?: string | null
  descriptionEn?: string | null
  subregion?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  establishedYear?: number | null
  seoName?: string | null
  businessName?: string | null
  regionId?: string | null
  countryId?: string | null
  countryCode?: string | null
  ratingsCount?: number | null
  ratingsAverage?: number | null
  winesCount?: number | null
  labelsCount?: number | null
  backgroundImageUrl?: string | null
  isActive?: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

export function mapWineryFromDto(dto: WineryDetailsInput): Winery {
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug ?? null,
    descriptionEs: dto.descriptionEs ?? null,
    descriptionEn: dto.descriptionEn ?? null,
    subregion: dto.subregion ?? null,
    address: dto.address ?? null,
    latitude: dto.latitude ?? null,
    longitude: dto.longitude ?? null,
    email: dto.email ?? null,
    phone: dto.phone ?? null,
    website: dto.website ?? null,
    logoUrl: dto.logoUrl ?? null,
    imageUrl: dto.imageUrl ?? null,
    establishedYear: dto.establishedYear ?? null,
    seoName: dto.seoName ?? null,
    businessName: dto.businessName ?? null,
    regionId: dto.regionId ?? null,
    regionName: dto.regionName ?? null,
    countryId: dto.countryId ?? null,
    countryCode: dto.countryCode ?? null,
    countryName: dto.countryName ?? null,
    ratingsCount: dto.ratingsCount ?? 0,
    ratingsAverage: dto.ratingsAverage ?? null,
    winesCount: dto.winesCount ?? 0,
    labelsCount: dto.labelsCount ?? 0,
    backgroundImageUrl: dto.backgroundImageUrl ?? null,
    isActive: dto.isActive ?? true,
    createdAt: dto.createdAt ?? null,
    updatedAt: dto.updatedAt ?? null,
  }
}

export function mapWinerySummaryFromDto(dto: WinerySummaryInput): WinerySummary {
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug ?? null,
    countryName: dto.countryName ?? null,
    regionName: dto.regionName ?? null,
    logoUrl: dto.logoUrl ?? null,
    imageUrl: dto.imageUrl ?? null,
    address: dto.address ?? null,
    latitude: dto.latitude ?? null,
    longitude: dto.longitude ?? null,
  }
}

/** Description in the reader's language, falling back to the other one. */
export function localizedWineryDescription(
  winery: { descriptionEs?: string | null; descriptionEn?: string | null } | null | undefined,
  language: string,
): string | null {
  const es = winery?.descriptionEs?.trim() || null
  const en = winery?.descriptionEn?.trim() || null
  return language.startsWith('en') ? en ?? es : es ?? en
}
