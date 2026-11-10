/**
 * Reference Data API Client
 *
 * Reads the database-backed catalogs (wine types) that replace hard-coded enums.
 */

import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import type { ReferenceDataDto } from '@api/dto/referenceData.dto'

export const referenceDataClient = {
  /** Active wine types, in catalog order. */
  async getWineTypes(): Promise<ReferenceDataDto[]> {
    const response = await http.get<ReferenceDataDto[]>(API_ENDPOINTS.REFERENCE.WINE_TYPES)
    return response.data
  },
}

export default referenceDataClient
