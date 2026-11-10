/**
 * Regions & Countries API Client
 *
 * Handles all region/country reference data API calls.
 */

import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'

export interface CountryDto {
  id: string
  code: string
  name: string
}

export interface RegionDto {
  id: string
  name: string
  countryId: string
  countryCode: string
  countryName: string
}

export const regionsClient = {
  /**
   * Get all countries
   */
  async getCountries(): Promise<CountryDto[]> {
    const response = await http.get<CountryDto[]>(`${API_ENDPOINTS.REGIONS}/countries`)
    return response.data
  },

  /**
   * Get all regions
   */
  async getRegions(): Promise<RegionDto[]> {
    const response = await http.get<RegionDto[]>(API_ENDPOINTS.REGIONS)
    return response.data
  },

  /**
   * Get regions by country ID
   */
  async getRegionsByCountry(countryId: string): Promise<RegionDto[]> {
    const response = await http.get<RegionDto[]>(`${API_ENDPOINTS.REGIONS}/country/${countryId}`)
    return response.data
  },
}

export default regionsClient

