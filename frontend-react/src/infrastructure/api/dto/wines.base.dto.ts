import type { WineReviewDto } from './wines.review.dto'

export type WineTypeDto = 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified'

export interface WineSummaryDto {
  id: string
  name: string
  vintage?: number | null
  wineType: WineTypeDto
  style?: string | null
  grapes?: string[]
  wineryName?: string | null
  region?: string | null
  country?: string | null
  priceMin?: number | null
  priceMax?: number | null
  ratingAverage?: number | null
  ratingCount?: number
  imageUrl?: string | null
  isFeatured?: boolean
  isActive?: boolean
  isNatural?: boolean
  bottleImageUrl?: string | null
  seoName?: string | null
}

export interface WineDetailsDto {
  id: string
  name: string
  wineryId?: string | null
  wineryName?: string | null
  region?: string | null
  country?: string | null
  vintage?: number | null
  wineType: WineTypeDto
  style?: string | null
  grapes?: string[]
  allergens?: string[]
  descriptionEs?: string | null
 descriptionEn?: string | null
  profileOverview?: Partial<Record<"es" | "en", {
    summary: string | null;
    acidityScore: number | null;
    tanninScore: number | null;
    bodyScore: number | null;
    sweetnessScore: number | null;
    foodPairings: string[];
  }>> | null;
  alcoholContent?: number | null
  servingTempMin?: number | null
  servingTempMax?: number | null
  priceMin?: number | null
  priceMax?: number | null
  imageUrl?: string | null
  ratingAverage?: number | null
  ratingCount?: number
  isFeatured?: boolean
  isActive?: boolean
  inCellar?: boolean
  isNatural?: boolean
  bottleImageUrl?: string | null
  externalUrl?: string | null
  foodPairing?: string | null
  seoName?: string | null
  bestVintageYear?: number | null
  bestVintageRating?: number | null
  regionId?: string | null
  regionName?: string | null
  countryId?: string | null
  countryName?: string | null
  createdAt?: string
  updatedAt?: string
  winery?: WineryInfoDto | null
  ratingDistribution?: RatingDistributionDto | null
  featuredReviews?: WineReviewDto[]
  userWineData?: UserWineDataDto | null
  aiProfileStatus?: 'NOT_REQUESTED' | 'GENERATED' | null
  aiProfileGeneratedAt?: string | null
  acidityScore?: number | null
  tanninScore?: number | null
  bodyScore?: number | null
  sweetnessScore?: number | null
}

export interface WineryInfoDto {
  id: string
  name: string
  region?: string | null
  country?: string | null
  regionName?: string | null
  countryName?: string | null
  logoUrl?: string | null
  websiteUrl?: string | null
}

export interface RatingDistributionDto {
  oneStar: number
  twoStar: number
  threeStar: number
  fourStar: number
  fiveStar: number
}

export interface UserWineDataDto {
  hasReviewed?: boolean
  userRating?: number | null
  inCellar?: boolean
  cellarQuantity?: number | null
}

export type WineDto = WineDetailsDto

export interface TastingNotesDto {
  appearance: string
  aroma: string[]
  palate: string[]
  finish: string
  body: 'light' | 'medium' | 'full'
  sweetness: 'dry' | 'off-dry' | 'medium-sweet' | 'sweet'
  tannins: 'low' | 'medium' | 'high'
  acidity: 'low' | 'medium' | 'high'
}

export interface WineAwardDto {
  name: string
  year: number
  medal?: 'gold' | 'silver' | 'bronze'
}

export interface WinesPageResponseDto {
  items: WineSummaryDto[]
  content: WineSummaryDto[]
  pageNumber: number
  pageSize: number
  totalItems: number
  totalPages: number
  first: boolean
  last: boolean
  hasNext: boolean
  hasPrevious: boolean
}
