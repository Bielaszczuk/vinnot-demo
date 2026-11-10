import { mapWineToDto } from '@domain/wine/wine.mappers'
import type {
  AiProfileStatus,
  Wine,
  WineFilter,
} from '@domain/wine/wine.types'
import type { PageMeta, PaginatedResponse } from '@api/api.types'
import type {
  CreateWineRequestDto,
  UpdateWineRequestDto,
  ReviewsPageResponseDto,
  WineFilterParamsDto,
  WineSummaryDto,
  WinesPageResponseDto,
} from '@api/dto/wines.dto'

export function mapWinesPagination(response: WinesPageResponseDto): PageMeta {
  return {
    pageNumber: response.pageNumber,
    pageSize: response.pageSize,
    totalItems: Number(response.totalItems),
    totalPages: response.totalPages,
    hasNext: response.hasNext,
    hasPrevious: response.hasPrevious,
  }
}

export function toUpdateWineRequestDto(wine: Partial<Wine>): UpdateWineRequestDto {
  return mapWineToDto(wine) as UpdateWineRequestDto
}

export function mapReviewsPagination(
  response: ReviewsPageResponseDto,
  page: number,
  pageSize: number,
): PageMeta {
  return {
    pageNumber: response.pageNumber ?? page,
    pageSize: response.pageSize ?? pageSize,
    totalItems: response.totalItems ?? 0,
    totalPages: response.totalPages ?? 0,
    hasNext: response.hasNext ?? false,
    hasPrevious: response.hasPrevious ?? false,
  }
}

export function mapFavoritesPagination(
  response: PaginatedResponse<WineSummaryDto>,
  pageSize: number,
): PageMeta {
  return {
    pageNumber: response.pagination?.pageNumber ?? 0,
    pageSize: response.pagination?.pageSize ?? pageSize,
    totalItems: Number(response.pagination?.totalItems ?? 0),
    totalPages: response.pagination?.totalPages ?? 0,
    hasNext: response.pagination?.hasNext ?? false,
    hasPrevious: response.pagination?.hasPrevious ?? false,
  }
}

export function mapAiProfileStatus(status: string): AiProfileStatus['status'] {
  const normalized = status.trim().toUpperCase()
  if (normalized === 'GENERATED' || normalized === 'READY') return 'READY'
  if (normalized === 'NOT_REQUESTED' || normalized === 'NOT_GENERATED') return 'NOT_GENERATED'
  if (normalized === 'FAILED' || normalized === 'ERROR') return 'FAILED'
  if (normalized === 'PENDING' || normalized === 'IN_PROGRESS' || normalized === 'PROCESSING' || normalized === 'GENERATING') {
    return 'GENERATING'
  }
  return 'PENDING'
}

export function toCreateWineRequestDto(
  wine: Omit<Wine, 'id' | 'rating' | 'reviewCount' | 'awards' | 'createdAt' | 'updatedAt'>,
): CreateWineRequestDto {
  const mapped = mapWineToDto(wine)
  return {
    name: String(mapped.name ?? wine.name),
    wineType: (mapped.wineType as CreateWineRequestDto['wineType']) ?? wine.type,
    wineryId: mapped.wineryId as string | undefined,
    vintage: mapped.vintage as number | undefined,
    style: mapped.style as string | undefined,
    grapes: mapped.grapes as string[] | undefined,
    allergens: mapped.allergens as string[] | undefined,
    descriptionEs: mapped.descriptionEs as string | undefined,
    descriptionEn: mapped.descriptionEn as string | undefined,
    alcoholContent: mapped.alcoholContent as number | undefined,
    servingTempMin: mapped.servingTempMin as number | undefined,
    servingTempMax: mapped.servingTempMax as number | undefined,
    priceMin: mapped.priceMin as number | undefined,
    priceMax: mapped.priceMax as number | undefined,
    imageUrl: mapped.imageUrl as string | undefined,
    acidityScore: mapped.acidityScore as number | null | undefined,
    tanninScore: mapped.tanninScore as number | null | undefined,
    bodyScore: mapped.bodyScore as number | null | undefined,
    sweetnessScore: mapped.sweetnessScore as number | null | undefined,
  }
}

export function mapFilterToParams(
  filter: WineFilter | undefined,
  page: number,
  pageSize: number,
): WineFilterParamsDto {
  const sortByMap: Record<string, 'name' | 'vintage' | 'priceMin' | 'priceMax' | 'ratingAverage'> = {
    name: 'name',
    price: 'priceMin',
    rating: 'ratingAverage',
    vintage: 'vintage',
  }

  return {
    page,
    size: pageSize,
    search: filter?.search,
    type: filter?.type as WineFilterParamsDto['type'],
    region: Array.isArray(filter?.region) ? filter?.region[0] : filter?.region,
    country: Array.isArray(filter?.country) ? filter?.country[0] : filter?.country,
    grapeVariety: Array.isArray(filter?.grapeVariety) ? filter?.grapeVariety[0] : filter?.grapeVariety,
    minPrice: filter?.minPrice,
    maxPrice: filter?.maxPrice,
    minRating: filter?.minRating,
    vintage: Array.isArray(filter?.vintage) ? filter?.vintage[0] : filter?.vintage,
    sortBy: filter?.sortBy ? sortByMap[filter.sortBy] : undefined,
    sortDirection: filter?.sortOrder?.toUpperCase() as 'ASC' | 'DESC' | undefined,
  }
}
