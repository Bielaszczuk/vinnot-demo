/**
 * Reference Data Service
 *
 * Application service for the database-backed catalogs: client call -> domain options.
 */

import { referenceDataClient } from '@api/clients/referenceData.client'
import { mapWineTypeOptionsFromDto } from '@domain/wine/wine.mappers.reference'
import type { WineTypeOption } from '@domain/wine/wine.types'

export const referenceDataService = {
  /** Active wine types from `GET /reference/wine-types`, so new types (orange) need no client release. */
  async getWineTypes(): Promise<WineTypeOption[]> {
    return mapWineTypeOptionsFromDto(await referenceDataClient.getWineTypes())
  },
}

export default referenceDataService
