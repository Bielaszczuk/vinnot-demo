import type { WineTypeDto } from './wines.base.dto'

export interface CreateWineRequestDto {
  name: string
  wineryId?: string
  wineType: WineTypeDto
  vintage?: number
  style?: string
  grapes?: string[]
  allergens?: string[]
  descriptionEs?: string
  descriptionEn?: string
  alcoholContent?: number
  servingTempMin?: number
  servingTempMax?: number
  priceMin?: number
  priceMax?: number
  imageUrl?: string
  acidityScore?: number | null
  tanninScore?: number | null
  bodyScore?: number | null
  sweetnessScore?: number | null
}

export type UpdateWineRequestDto = Partial<CreateWineRequestDto>

export interface WineFilterParamsDto {
  search?: string
  type?: WineTypeDto
  country?: string
  region?: string
  grapeVariety?: string
  vintage?: number
  wineryId?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  featured?: boolean
  sortBy?: 'name' | 'vintage' | 'priceMin' | 'priceMax' | 'ratingAverage'
  sortDirection?: 'ASC' | 'DESC'
  page?: number
  size?: number
}
