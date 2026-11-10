/**
 * Grape Types Service
 *
 * Application service layer for grape type reference data.
 * Orchestrates: API client calls -> domain model returns.
 */

import { grapeTypesClient, type GrapeTypeDto } from '@api/clients/grapeTypes.client'

export interface GrapeType {
  id: string
  name: string
}

function mapGrapeTypeFromDto(dto: GrapeTypeDto): GrapeType {
  return {
    id: dto.id,
    name: dto.name,
  }
}

export const grapeTypesService = {
  /**
   * Get all grape types
   */
  async getGrapeTypes(): Promise<GrapeType[]> {
    const dtos = await grapeTypesClient.getGrapeTypes()
    return dtos.map(mapGrapeTypeFromDto)
  },
}

export default grapeTypesService

