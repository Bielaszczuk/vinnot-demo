/**
 * Winery domain types
 */

export interface Winery {
  id: string
  name: string
  slug: string | null
  descriptionEs: string | null
  descriptionEn: string | null
  subregion: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  email: string | null
  phone: string | null
  website: string | null
  logoUrl: string | null
  imageUrl: string | null
  establishedYear: number | null
  seoName: string | null
  businessName: string | null
  regionId: string | null
  regionName: string | null
  countryId: string | null
  countryCode: string | null
  countryName: string | null
  ratingsCount: number
  ratingsAverage: number | null
  winesCount: number
  labelsCount: number
  backgroundImageUrl: string | null
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

export interface WinerySummary {
  id: string
  name: string
  slug: string | null
  countryName: string | null
  regionName: string | null
  logoUrl: string | null
  imageUrl: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
}

export interface WineryFilter {
  search?: string
  country?: string
  region?: string
}

