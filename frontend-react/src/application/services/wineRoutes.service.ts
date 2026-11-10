import { wineRoutesClient } from '@api/clients/wineRoutes.client'
import { mapWineRouteFromDto, mapWineRouteSummaryFromDto } from '@domain/route/route.mappers'
import type { RouteDifficulty, WineRoute, WineRouteFilter, WineRouteHierarchy } from '@domain/route/route.types'
import type { RouteDifficultyParamDto, WineRouteFilterParamsDto } from '@api/dto/wineRoutes.dto'
import type { PageMeta } from '@api/api.types'

/** The API filters by one difficulty; the first one wins when several are given. */
function toDifficultyParam(difficulty: WineRouteFilter['difficulty']): RouteDifficultyParamDto | undefined {
  const first: RouteDifficulty | undefined = [difficulty ?? []].flat()[0]
  return first ? (first.toUpperCase() as RouteDifficultyParamDto) : undefined
}

export interface WineRoutesResult {
  routes: WineRoute[]
  pagination: PageMeta
}

/**
 * Wine Routes service
 */
export const wineRoutesService = {
  /**
   * Get hierarchy of countries/regions/subregions
   */
  async getHierarchy(): Promise<WineRouteHierarchy> {
    const response = await wineRoutesClient.getHierarchy()
    return {
      countries: response.countries.map(c => ({
        name: c.name,
        regions: c.regions.map(r => ({
          name: r.name,
          subregions: r.subregions,
        })),
      })),
    }
  },

  /**
   * Get list of countries
   */
  async getCountries(): Promise<string[]> {
    return await wineRoutesClient.getCountries()
  },

  /**
   * Get regions for a country
   */
  async getRegions(country: string): Promise<string[]> {
    return await wineRoutesClient.getRegions(country)
  },

  /**
   * Get subregions for a country/region
   */
  async getSubregions(country: string, region: string): Promise<string[]> {
    return await wineRoutesClient.getSubregions(country, region)
  },

  /**
   * Get paginated list of wine routes
   */
  async getWineRoutes(filter?: WineRouteFilter, page = 0, pageSize = 20): Promise<WineRoutesResult> {
    const params: WineRouteFilterParamsDto = {
      page,
      size: pageSize,
      search: filter?.search,
      country: filter?.country,
      region: filter?.region,
      subregion: filter?.subregion,
      difficulty: toDifficultyParam(filter?.difficulty),
    }

    const response = await wineRoutesClient.getWineRoutes(params)


    const items = response.items ?? response.content ?? []

    return {
      routes: items.map(mapWineRouteSummaryFromDto),
      pagination: {
        pageNumber: response.pageNumber ?? page,
        pageSize: response.pageSize ?? pageSize,
        totalItems: response.totalItems ?? 0,
        totalPages: response.totalPages ?? 0,
        hasNext: response.hasNext ?? !response.last,
        hasPrevious: response.hasPrevious ?? !response.first,
      },
    }
  },

  /**
   * Get a single wine route by ID
   */
  async getWineRoute(id: string): Promise<WineRoute> {
    const response = await wineRoutesClient.getWineRoute(id)
    return mapWineRouteFromDto(response)
  },
}

export default wineRoutesService
