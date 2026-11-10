import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import type { PaginatedResponse } from '@api/api.types'
import type { WineSummaryDto } from '@api/dto/wines.dto'

export const winesFavoritesClient = {
  async addToFavorites(wineId: string): Promise<void> {
    await http.post(`${API_ENDPOINTS.WINES}/${wineId}/favorite`)
  },

  async removeFromFavorites(wineId: string): Promise<void> {
    await http.delete(`${API_ENDPOINTS.WINES}/${wineId}/favorite`)
  },

  async getFavoriteWines(
    params?: { page?: number; pageSize?: number },
  ): Promise<PaginatedResponse<WineSummaryDto>> {
    const response = await http.get<PaginatedResponse<WineSummaryDto>>(
      `${API_ENDPOINTS.WINES}/favorites`,
      { params: { page: params?.page, size: params?.pageSize } },
    )
    return response.data
  },
}
