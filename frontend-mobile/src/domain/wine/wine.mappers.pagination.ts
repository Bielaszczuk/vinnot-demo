import type { PaginatedInput, PaginatedResult, ReviewsPageInput, WineReview, WinesPageInput, WineSummary } from "./wine.mappers.types";
import { mapWineReview } from "./wine.mappers.review";
import { mapWineSummary } from "./wine.mappers.summary";

export function mapWinesPage(dto: WinesPageInput): PaginatedResult<WineSummary> {
  const items = dto.items ?? dto.content ?? [];
  return {
    items: items.map(mapWineSummary),
    total: dto.totalItems ?? items.length,
    totalPages: dto.totalPages ?? 1,
    page: dto.pageNumber ?? 0,
    size: dto.pageSize ?? items.length,
    isFirst: dto.first ?? dto.pageNumber === 0,
    isLast: dto.last ?? !(dto.hasNext ?? false),
    hasNext: dto.hasNext ?? false,
    hasPrevious: dto.hasPrevious ?? false,
  };
}

export function mapReviewsPage(dto: ReviewsPageInput): PaginatedResult<WineReview> {
  const items = dto.items ?? dto.content ?? [];
  const page = dto.pageNumber ?? dto.number ?? 0;
  return {
    items: items.map(mapWineReview),
    total: dto.totalItems ?? dto.totalElements ?? items.length,
    totalPages: dto.totalPages ?? 1,
    page,
    size: dto.pageSize ?? dto.size ?? items.length,
    isFirst: dto.first ?? page === 0,
    isLast: dto.last ?? !(dto.hasNext ?? false),
    hasNext: dto.hasNext ?? false,
    hasPrevious: dto.hasPrevious ?? false,
  };
}

export function mapPaginated<TDto, TDomain>(
  dto: PaginatedInput<TDto>,
  mapper: (item: TDto) => TDomain,
): PaginatedResult<TDomain> {
  const items = dto.items ?? dto.content ?? [];
  return {
    items: items.map(mapper),
    total: dto.totalItems ?? dto.totalElements ?? items.length,
    totalPages: dto.totalPages ?? 1,
    page: dto.pageNumber ?? dto.number ?? 0,
    size: dto.pageSize ?? dto.size ?? items.length,
    isFirst: dto.first ?? (dto.pageNumber ?? dto.number ?? 0) === 0,
    isLast: dto.last ?? !(dto.hasNext ?? false),
    hasNext: dto.hasNext ?? false,
    hasPrevious: dto.hasPrevious ?? false,
  };
}
