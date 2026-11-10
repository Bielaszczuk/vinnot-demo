/**
 * Regions Service
 *
 * Application service layer for region/country reference data.
 * Orchestrates: API client calls -> domain model returns.
 */

import { regionsClient, type RegionDto, type CountryDto } from '@api/clients/regions.client'

export interface Region {
  id: string
  name: string
  countryId: string
  countryCode: string
  countryName: string
}

export interface Country {
  id: string
  code: string
  name: string
}

function mapRegionFromDto(dto: RegionDto): Region {
  return {
    id: dto.id,
    name: dto.name,
    countryId: dto.countryId,
    countryCode: dto.countryCode,
    countryName: dto.countryName,
  }
}

function mapCountryFromDto(dto: CountryDto): Country {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
  }
}

export const regionsService = {
  /**
   * Get all regions
   */
  async getRegions(): Promise<Region[]> {
    const dtos = await regionsClient.getRegions()
    return dtos.map(mapRegionFromDto)
  },

  /**
   * Get all countries
   */
  async getCountries(): Promise<Country[]> {
    const dtos = await regionsClient.getCountries()
    return dtos.map(mapCountryFromDto)
  },

  /**
   * Get regions by country ID
   */
  async getRegionsByCountry(countryId: string): Promise<Region[]> {
    const dtos = await regionsClient.getRegionsByCountry(countryId)
    return dtos.map(mapRegionFromDto)
  },
}

export default regionsService

