import { winesClient } from '@api/clients/wines.client'
import {
  mapWineFromDto,
  mapWineSummaryFromDto,
  mapWineReviewFromDto,
  mapWineComparisonFromDto,
  mapAiProfileFromDto,
  mapWineScanResultFromDto,
  mapWineReviewCommentFromDto,
} from '@domain/wine/wine.mappers'
import type {
  Wine,
  WineSummary,
  WineReview,
  WineReviewComment,
  WineFilter,
  WineComparison,
  AiWineProfile,
  WineScanResult,
  AiProfileStatus,
} from '@domain/wine/wine.types'
import { toVintageCreateFields, toVintagePatchFields } from '@domain/wine/wine.vintage'
import type { PageMeta } from '@api/api.types'
import { isHttpError } from '@infrastructure/http/errors'
import {
  mapAiProfileStatus,
  mapFavoritesPagination,
  mapFilterToParams,
  mapReviewsPagination,
  mapWinesPagination,
  toCreateWineRequestDto,
  toUpdateWineRequestDto,
} from './wines.service.helpers'
export interface WinesResult {
  wines: WineSummary[]
  pagination: PageMeta
}

export interface WineDetailsResult {
  wine: Wine
}

export interface WineReviewsResult {
  reviews: WineReview[]
  pagination: PageMeta
}

export class ReviewStateConflictError extends Error {
  constructor() {
    super('The review state changed while it was being saved')
    this.name = 'ReviewStateConflictError'
  }
}

export const winesService = {
  async getWines(filter?: WineFilter, page = 0, pageSize = 20): Promise<WinesResult> {
    const params = mapFilterToParams(filter, page, pageSize)
    const response = await winesClient.getWines(params)
    const items = response.items ?? response.content ?? []

    return {
      wines: items.map(mapWineSummaryFromDto),
      pagination: mapWinesPagination(response),
    }
  },

  async getWine(id: string): Promise<Wine> {
    const response = await winesClient.getWine(id)
    return mapWineFromDto(response)
  },

  async getSimilarWines(wineId: string, limit = 5): Promise<WineSummary[]> {
    const response = await winesClient.getSimilarWines(wineId, limit)
    return response.map(mapWineSummaryFromDto)
  },

  async getRecommendedWines(limit = 10): Promise<WineSummary[]> {
    const response = await winesClient.getRecommendedWines(limit)
    return response.map(mapWineSummaryFromDto)
  },

  async getPopularWines(limit = 10): Promise<WineSummary[]> {
    const response = await winesClient.getPopularWines(limit)
    return response.map(mapWineSummaryFromDto)
  },
  async createWine(wine: Omit<Wine, 'id' | 'rating' | 'reviewCount' | 'awards' | 'createdAt' | 'updatedAt'>): Promise<Wine> {
    const dto = toCreateWineRequestDto(wine)
    const response = await winesClient.createWine(dto)
    return mapWineFromDto(response)
  },

  async updateWine(id: string, wine: Partial<Wine>): Promise<Wine> {
    const dto = toUpdateWineRequestDto(wine)
    const response = await winesClient.updateWine(id, dto)
    return mapWineFromDto(response)
  },

  async deleteWine(id: string): Promise<void> {
    await winesClient.deleteWine(id)
  },
  async getWineReviews(
    wineId: string,
    page = 0,
    pageSize = 10,
    filter: 'recent' | 'popular' | 'mine' = 'recent',
  ): Promise<WineReviewsResult> {
    const response = await winesClient.getWineReviews(wineId, { page, pageSize, filter })
    const reviews = response.items ?? response.content ?? []

    return {
      reviews: reviews.map(mapWineReviewFromDto),
      pagination: mapReviewsPagination(response, page, pageSize),
    }
  },

  async addReview(
    wineId: string,
    rating: number,
    title?: string,
    comment?: string,
    vintage?: number | null,
  ): Promise<WineReview> {
    try {
      const response = await winesClient.createWineReview(wineId, {
        rating, title, comment, ...toVintageCreateFields(vintage),
      })
      return mapWineReviewFromDto(response)
    } catch (error) {
      if (isReviewStateConflict(error)) throw new ReviewStateConflictError()
      throw error
    }
  },

  async updateReview(
    wineId: string,
    reviewId: string,
    rating: number,
    title?: string,
    comment?: string,
    /** A year sets the vintage, `null` clears it, `undefined` keeps the stored one. */
    vintage?: number | null,
  ): Promise<WineReview> {
    try {
      const response = await winesClient.updateWineReview(wineId, reviewId, {
        rating, title, comment, ...toVintagePatchFields(vintage),
      })
      return mapWineReviewFromDto(response)
    } catch (error) {
      if (isReviewStateConflict(error)) throw new ReviewStateConflictError()
      throw error
    }
  },

  async deleteReview(wineId: string, reviewId: string): Promise<void> {
    await winesClient.deleteWineReview(wineId, reviewId)
  },

  async markReviewHelpful(wineId: string, reviewId: string): Promise<void> {
    await winesClient.markReviewHelpful(wineId, reviewId)
  },

  async unmarkReviewHelpful(wineId: string, reviewId: string): Promise<void> {
    await winesClient.unmarkReviewHelpful(wineId, reviewId)
  },

  async getMyReviewStatus(wineId: string): Promise<{ hasReview: boolean }> {
    return winesClient.getMyReviewStatus(wineId)
  },

  async getReviewComments(wineId: string, reviewId: string): Promise<WineReviewComment[]> {
    const response = await winesClient.getReviewComments(wineId, reviewId)
    return response.map(mapWineReviewCommentFromDto)
  },

  async addReviewComment(wineId: string, reviewId: string, content: string): Promise<WineReviewComment> {
    const response = await winesClient.addReviewComment(wineId, reviewId, content)
    return mapWineReviewCommentFromDto(response)
  },

  async deleteReviewComment(wineId: string, reviewId: string, commentId: string): Promise<void> {
    await winesClient.deleteReviewComment(wineId, reviewId, commentId)
  },
  async compareWines(wineAId: string, wineBId: string, language = 'es'): Promise<WineComparison> {
    const response = await winesClient.compareWines(wineAId, wineBId, language)
    return mapWineComparisonFromDto(response)
  },

  /** The profile in that language, or null when none was generated yet (the API answers 404). */
  async getAiProfile(wineId: string, language = 'es'): Promise<AiWineProfile | null> {
    try {
      return mapAiProfileFromDto(await winesClient.getAiProfile(wineId, language))
    } catch (error) {
      if (isHttpError(error) && error.status === 404) return null
      throw error
    }
  },

  async getAiProfileStatus(wineId: string, language = 'es'): Promise<AiProfileStatus> {
    const dto = await winesClient.getAiProfileStatus(wineId, language)
    return {
      status: mapAiProfileStatus(dto.status),
      generatedAt: dto.generatedAt ?? null,
    }
  },

  async generateAiProfile(wineId: string, language = 'es'): Promise<AiWineProfile> {
    const response = await winesClient.generateAiProfile(wineId, language)
    return mapAiProfileFromDto(response)
  },

  async regenerateAiProfile(wineId: string, language = 'es'): Promise<AiWineProfile> {
    const response = await winesClient.regenerateAiProfile(wineId, language)
    return mapAiProfileFromDto(response)
  },

  async scanWineLabel(imageFile: File | string): Promise<WineScanResult> {
    const response = await winesClient.scanWineLabel(imageFile)
    return mapWineScanResultFromDto(response)
  },
  async addToFavorites(wineId: string): Promise<void> {
    await winesClient.addToFavorites(wineId)
  },

  async removeFromFavorites(wineId: string): Promise<void> {
    await winesClient.removeFromFavorites(wineId)
  },

  async getFavoriteWines(page = 1, pageSize = 20): Promise<WinesResult> {
    const response = await winesClient.getFavoriteWines({ page, pageSize })
    const items = response.data ?? []

    return {
      wines: items.map(mapWineSummaryFromDto),
      pagination: mapFavoritesPagination(response, pageSize),
    }
  },
}

function isReviewStateConflict(error: unknown): boolean {
  return isHttpError(error) && (error.status === 409 || error.status === 422)
}

export default winesService
