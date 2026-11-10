/**
 * Wineries Service
 *
 * Application service layer for winery-related operations.
 * Orchestrates: API client calls → DTO mapping → domain model returns.
 */

import { wineriesClient } from '@api/clients/wineries.client'
import { winesClient } from '@api/clients/wines.client'
import { mapWineryFromDto, mapWinerySummaryFromDto } from '@domain/winery/winery.mappers'
import { mapWineSummaryFromDto } from '@domain/wine/wine.mappers'
import type { Winery, WinerySummary, WineryFilter } from '@domain/winery/winery.types'
import type { WineSummary } from '@domain/wine/wine.types'
import type { PageMeta } from '@api/api.types'

export interface WineriesResult {
  wineries: WinerySummary[]
  pagination: PageMeta
}

export interface WineryWinesResult {
  wines: WineSummary[]
  pagination: PageMeta
}

/**
 * Wineries service
 */
export const wineriesService = {
  /**
   * Get paginated list of wineries
   */
  async getWineries(filter?: WineryFilter, page = 0, pageSize = 20): Promise<WineriesResult> {
    const response = await wineriesClient.getWineries({
      search: filter?.search,
      country: filter?.country,
      region: filter?.region,
      page,
      size: pageSize,
    })

    const items = response.content ?? []

    return {
      wineries: items.map(mapWinerySummaryFromDto),
      pagination: {
        pageNumber: response.page,
        pageSize: response.size,
        totalItems: response.totalElements,
        totalPages: response.totalPages,
        hasNext: response.page < response.totalPages - 1,
        hasPrevious: response.page > 0,
      },
    }
  },

  /**
   * Get a single winery by ID
   */
  async getWinery(id: string): Promise<Winery> {
    const response = await wineriesClient.getWinery(id)
    return mapWineryFromDto(response)
  },

  /**
   * Persist winery coordinates inferred from geocoding.
   */
  async updateWineryCoordinates(id: string, latitude: number, longitude: number, address?: string | null): Promise<void> {
    await wineriesClient.updateCoordinates(id, { latitude, longitude, address: address ?? null })
  },

  /**
   * Get wines belonging to a specific winery.
   * Uses the wines endpoint filtered by wineryId.
   */
  async getWineryWines(wineryId: string, page = 0, pageSize = 20): Promise<WineryWinesResult> {
    const params = { wineryId, page, size: pageSize }
    const response = await winesClient.getWines(params)

    const items = response.items ?? response.content ?? []

    return {
      wines: items.map(mapWineSummaryFromDto),
      pagination: {
        pageNumber: response.pageNumber ?? page,
        pageSize: response.pageSize ?? pageSize,
        totalItems: Number(response.totalItems ?? 0),
        totalPages: response.totalPages ?? 0,
        hasNext: response.hasNext ?? false,
        hasPrevious: response.hasPrevious ?? false,
      },
    }
  },
}

export default wineriesService
