import { resolveWineAssetUrls as resolveCover } from "@infrastructure/http/resolveApiAssetUrl";
import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import type {
  WineRouteDetailsDto,
  WineRouteHierarchyDto,
  WineRouteFilterParamsDto,
  WineRoutesPageResponseDto,
} from '@api/dto/wineRoutes.dto'

/**
 * Wine Routes API client
 * Note: Backend returns data directly (no wrapper).
 */
export const wineRoutesClient = {
  /**
   * Get hierarchy of countries/regions/subregions
   */
  async getHierarchy(): Promise<WineRouteHierarchyDto> {
    const response = await http.get<WineRouteHierarchyDto>(`${API_ENDPOINTS.WINE_ROUTES}/hierarchy`)
    return response.data
  },

  /**
   * Get list of countries
   */
  async getCountries(): Promise<string[]> {
    const response = await http.get<string[]>(`${API_ENDPOINTS.WINE_ROUTES}/countries`)
    return response.data
  },

  /**
   * Get regions for a country
   */
  async getRegions(country: string): Promise<string[]> {
    const response = await http.get<string[]>(`${API_ENDPOINTS.WINE_ROUTES}/countries/${encodeURIComponent(country)}/regions`)
    return response.data
  },

  /**
   * Get subregions for a country/region
   */
  async getSubregions(country: string, region: string): Promise<string[]> {
    const response = await http.get<string[]>(
      `${API_ENDPOINTS.WINE_ROUTES}/countries/${encodeURIComponent(country)}/regions/${encodeURIComponent(region)}/subregions`
    )
    return response.data
  },

  /**
   * Get paginated list of wine routes
   */
  async getWineRoutes(params?: WineRouteFilterParamsDto): Promise<WineRoutesPageResponseDto> {
    const response = await http.get<WineRoutesPageResponseDto>(API_ENDPOINTS.WINE_ROUTES, {
      params,
    })
    return { ...response.data, content: response.data.content.map(resolveCover) }
  },

  /**
   * Get a single wine route by ID
   */
  async getWineRoute(id: string): Promise<WineRouteDetailsDto> {
    const response = await http.get<WineRouteDetailsDto>(`${API_ENDPOINTS.WINE_ROUTES}/${id}`)
    return resolveCover(response.data)
  },
}

export default wineRoutesClient
