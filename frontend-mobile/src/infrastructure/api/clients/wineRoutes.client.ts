/**
 * Wine Routes API Client.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { resolveApiAssetUrl } from "@/infrastructure/api/resolveApiAssetUrl";
import { http } from "@/infrastructure/api/http";
import type {
  WineRouteDetailsDto,
  WineRouteHierarchyDto,
  WineRouteFilterParamsDto,
  WineRoutesPageResponseDto,
} from "@/infrastructure/api/dto/wineRoutes.dto";

export const wineRoutesApiClient = {
  getHierarchy: (): Promise<WineRouteHierarchyDto> =>
    http.get<WineRouteHierarchyDto>("/wine-routes/hierarchy").then((r) => r.data),

  getCountries: (): Promise<string[]> =>
    http.get<string[]>("/wine-routes/countries").then((r) => r.data),

  getRegions: (country: string): Promise<string[]> =>
    http
      .get<string[]>(`/wine-routes/countries/${encodeURIComponent(country)}/regions`)
      .then((r) => r.data),

  getSubregions: (country: string, region: string): Promise<string[]> =>
    http
      .get<string[]>(
        `/wine-routes/countries/${encodeURIComponent(country)}/regions/${encodeURIComponent(region)}/subregions`
      )
      .then((r) => r.data),

  getWineRoutes: (params?: WineRouteFilterParamsDto): Promise<WineRoutesPageResponseDto> =>
    http.get<WineRoutesPageResponseDto>("/wine-routes", { params }).then(({ data }) => ({
      ...data,
      ...(data.items ? { items: data.items.map(resolveCover) } : {}),
      ...(data.content ? { content: data.content.map(resolveCover) } : {}),
    })),

  getWineRoute: (id: string): Promise<WineRouteDetailsDto> =>
    http.get<WineRouteDetailsDto>(`/wine-routes/${id}`).then(({ data }) => resolveCover(data)),
};

function resolveCover<T extends { imageUrl?: string | null }>(route: T): T {
  return { ...route, imageUrl: resolveApiAssetUrl(route.imageUrl) };
}
