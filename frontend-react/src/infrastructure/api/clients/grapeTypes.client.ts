/**
 * Grape Types API Client
 *
 * Handles grape type reference data API calls.
 * Uses the configured axios instance for automatic token handling.
 */

import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'

export interface GrapeTypeDto {
  id: string
  name: string
}

export const grapeTypesClient = {
  /**
   * Get all grape types
   */
  async getGrapeTypes(): Promise<GrapeTypeDto[]> {
    const response = await http.get<GrapeTypeDto[]>(API_ENDPOINTS.GRAPE_TYPES)
    return response.data
  },
}

export default grapeTypesClient

