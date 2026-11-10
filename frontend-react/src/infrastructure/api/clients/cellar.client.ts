import { resolveCellarAssetUrls } from "@infrastructure/http/resolveApiAssetUrl";
import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import type {
  AddToCellarRequestDto,
  CellarEntryDto,
  UpdateCellarEntryRequestDto,
} from '@api/dto/cellar.dto'

/**
 * Cellar API client
 * Note: Backend returns data directly (no wrapper).
 */
export const cellarClient = {
  /**
   * Get all cellar entries for the current user
   */
  async getCellar(): Promise<CellarEntryDto[]> {
    const response = await http.get<CellarEntryDto[]>(API_ENDPOINTS.CELLAR)
    return response.data.map(resolveCellarAssetUrls)
  },

  /**
   * Add a wine to the cellar
   */
  async addWine(payload: AddToCellarRequestDto): Promise<CellarEntryDto> {
    const response = await http.post<CellarEntryDto>(API_ENDPOINTS.CELLAR, payload)
    return resolveCellarAssetUrls(response.data)
  },

  /**
   * Remove a wine from the cellar
   */
  async removeWine(cellarWineId: string): Promise<void> {
    await http.delete(`${API_ENDPOINTS.CELLAR}/${cellarWineId}`)
  },

  /**
   * Update a cellar entry
   */
  async updateWine(cellarWineId: string, payload: UpdateCellarEntryRequestDto): Promise<CellarEntryDto> {
    const response = await http.patch<CellarEntryDto>(
      `${API_ENDPOINTS.CELLAR}/${cellarWineId}`,
      payload,
    )
    return resolveCellarAssetUrls(response.data)
  },
}

export default cellarClient

