/**
 * Wine Routes Service.
 * @architecture: Capa 3 — Aplicación
 */
import { wineRoutesApiClient } from "@/infrastructure/api/clients/wineRoutes.client";
import { mapWineRouteFromDto, mapWineRouteSummaryFromDto } from "@/domain/route/route.mappers";
import type { WineRoute, WineRouteFilter, WineRouteHierarchy } from "@/domain/route/route.types";

export interface WineRoutesResult {
  routes: WineRoute[];
  pagination: { pageNumber: number; pageSize: number; totalItems: number; totalPages: number; hasNext: boolean; hasPrevious: boolean };
}

export const wineRoutesService = {
  async getHierarchy(): Promise<WineRouteHierarchy> {
    const response = await wineRoutesApiClient.getHierarchy();
    return {
      countries: response.countries.map((c) => ({
        name: c.name,
        regions: c.regions.map((r) => ({ name: r.name, subregions: r.subregions })),
      })),
    };
  },

  async getCountries(): Promise<string[]> {
    return wineRoutesApiClient.getCountries();
  },

  async getRegions(country: string): Promise<string[]> {
    return wineRoutesApiClient.getRegions(country);
  },

  async getSubregions(country: string, region: string): Promise<string[]> {
    return wineRoutesApiClient.getSubregions(country, region);
  },

  async getWineRoutes(filter?: WineRouteFilter, page = 0, pageSize = 20): Promise<WineRoutesResult> {
    const response = await wineRoutesApiClient.getWineRoutes({
      page,
      size: pageSize,
      search: filter?.search,
      country: filter?.country,
      region: filter?.region,
      subregion: filter?.subregion,
    });
    const items = response.items ?? response.content ?? [];
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
    };
  },

  async getWineRoute(id: string): Promise<WineRoute> {
    const response = await wineRoutesApiClient.getWineRoute(id);
    return mapWineRouteFromDto(response);
  },
};

