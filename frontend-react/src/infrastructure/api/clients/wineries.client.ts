/**
 * Wineries API Client
 *
 * Handles all winery-related API calls.
 * Uses the configured axios instance for automatic token handling.
 */

import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import type {
  WineryDetailsDto,
  WineryFilterParamsDto,
  WineriesPageResponseDto,
  UpdateWineryCoordinatesRequestDto,
} from '@api/dto/wineries.dto'

/**
 * Wineries API client
 */
export const wineriesClient = {
  /**
   * Search/list wineries with optional filters and pagination.
   */
  async getWineries(params?: WineryFilterParamsDto): Promise<WineriesPageResponseDto> {
    const response = await http.get<WineriesPageResponseDto>(API_ENDPOINTS.WINERIES, { params })
    return response.data
  },

  /**
   * Get a single winery by ID.
   */
  async getWinery(id: string): Promise<WineryDetailsDto> {
    const response = await http.get<WineryDetailsDto>(`${API_ENDPOINTS.WINERIES}/${id}`)
    return response.data
  },

  /**
   * Persist inferred geocoded coordinates for a winery.
   */
  async updateCoordinates(id: string, payload: UpdateWineryCoordinatesRequestDto): Promise<void> {
    await http.patch(`${API_ENDPOINTS.WINERIES}/${id}/coordinates`, payload)
  },
}

export default wineriesClient
