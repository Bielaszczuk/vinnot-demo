/**
 * Wineries Service.
 * @architecture: Capa 3 — Aplicación
 */
import { wineriesApiClient } from "@/infrastructure/api/clients/wineries.client";
import { winesClient } from "@/infrastructure/api/clients/wines.client";
import { mapWineryFromDto, mapWinerySummaryFromDto } from "@/domain/winery/winery.mappers";
import { mapWinesPage } from "@/domain/wine/wine.mappers";
import type { Winery, WinerySummary, WineryFilter } from "@/domain/winery/winery.types";
import type { PaginatedResult, WineSummary } from "@/domain/wine/wine.types";

export interface WineriesResult {
  wineries: WinerySummary[];
  pagination: { pageNumber: number; pageSize: number; totalItems: number; totalPages: number; hasNext: boolean; hasPrevious: boolean };
}

export const wineriesService = {
  async getWineries(filter?: WineryFilter, page = 0, pageSize = 20): Promise<WineriesResult> {
    const response = await wineriesApiClient.getWineries({
      search: filter?.search,
      country: filter?.country,
      region: filter?.region,
      page,
      size: pageSize,
    });
    const items = response.items ?? response.content ?? [];
    const pageNumber = response.pageNumber ?? page;
    const totalPages = response.totalPages ?? 0;
    return {
      wineries: items.map(mapWinerySummaryFromDto),
      pagination: {
        pageNumber,
        pageSize: response.pageSize ?? pageSize,
        totalItems: response.totalItems ?? items.length,
        totalPages,
        hasNext: response.hasNext ?? pageNumber < totalPages - 1,
        hasPrevious: response.hasPrevious ?? pageNumber > 0,
      },
    };
  },

  async getWinery(id: string): Promise<Winery> {
    const response = await wineriesApiClient.getWinery(id);
    return mapWineryFromDto(response);
  },

  /** The API has no `/wineries/{id}/wines`; the catalog filtered by winery is the source (as on the web). */
  async getWineryWines(id: string, page = 0, pageSize = 20): Promise<PaginatedResult<WineSummary>> {
    const response = await winesClient.getWines({ wineryId: id, page, size: pageSize });
    return mapWinesPage(response);
  },

  async updateWineryCoordinates(id: string, latitude: number, longitude: number, address?: string | null): Promise<void> {
    await wineriesApiClient.updateCoordinates(id, { latitude, longitude, address: address ?? null });
  },
};
