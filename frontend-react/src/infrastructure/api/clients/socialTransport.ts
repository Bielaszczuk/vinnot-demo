import { resolveApiAssetUrl, withAvatar } from '@infrastructure/http/resolveApiAssetUrl'
import type { SocialPageDto, SocialWineDto, UserReviewDto } from '@api/dto/social.dto'

type RawPage = Record<string, unknown>

/**
 * Reads a backend PageResult, either serialized by the page advice
 * (`items`/`content`, `pageNumber`, `totalItems`) or wrapped in `data`.
 */
export function toSocialPage<T>(raw: unknown, normalize: (item: T) => T = (item) => item): SocialPageDto<T> {
  const body = (raw ?? {}) as RawPage
  const page = (body.data && !Array.isArray(body.data) ? body.data : body) as RawPage
  const content = (page.content ?? page.items ?? []) as T[]
  return {
    content: content.map(normalize),
    page: Number(page.pageNumber ?? page.page ?? 0),
    totalItems: Number(page.totalItems ?? page.totalElements ?? 0),
    totalPages: Number(page.totalPages ?? 0),
  }
}

/** Reads a plain list, accepting the `data` wrapper some endpoints use. */
export function toList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  const data = (raw as { data?: unknown } | null)?.data
  return Array.isArray(data) ? (data as T[]) : []
}

export function withWineImage<T extends { wine: SocialWineDto }>(item: T): T {
  return { ...item, wine: { ...item.wine, imageUrl: resolveApiAssetUrl(item.wine.imageUrl) } }
}

export function normalizeUserReview(review: UserReviewDto): UserReviewDto {
  return withWineImage({ ...review, reviewer: withAvatar(review.reviewer) })
}
