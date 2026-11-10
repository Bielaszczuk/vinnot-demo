/**
 * Winery DTOs — match backend response shapes exactly.
 */

/** Summary DTO returned in list/search results */
export interface WinerySummaryDto {
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

/** Detail DTO returned by GET /wineries/:id */
export interface WineryDetailsDto {
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
  ratingsCount: number | null
  ratingsAverage: number | null
  winesCount: number | null
  labelsCount: number | null
  backgroundImageUrl: string | null
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

/** Search filter params for GET /wineries */
export interface WineryFilterParamsDto {
  search?: string
  country?: string
  region?: string
  page?: number
  size?: number
}

export interface UpdateWineryCoordinatesRequestDto {
  latitude: number
  longitude: number
  address?: string | null
}

/**
 * Paginated response from GET /wineries.
 * Backend returns PageResult<WinerySummaryResponse> with shape:
 *   { content, page, size, totalElements, totalPages }
 */
export interface WineriesPageResponseDto {
  content: WinerySummaryDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
