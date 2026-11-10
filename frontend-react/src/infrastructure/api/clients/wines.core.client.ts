import { resolveWineAssetUrls, resolveWinePageAssetUrls } from "@infrastructure/http/resolveApiAssetUrl"
import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import type {
  CreateWineRequestDto,
  UpdateWineRequestDto,
  WineDetailsDto,
  WineFilterParamsDto,
  WineSummaryDto,
  WinesPageResponseDto,
} from '@api/dto/wines.dto'

export const winesCoreClient = {
  async getWines(params?: WineFilterParamsDto): Promise<WinesPageResponseDto> {
    const response = await http.get<WinesPageResponseDto>(API_ENDPOINTS.WINES, { params })
    return resolveWinePageAssetUrls(response.data)
  },

  async getWine(id: string): Promise<WineDetailsDto> {
    const response = await http.get<WineDetailsDto>(`${API_ENDPOINTS.WINES}/${id}`)
    return resolveWineAssetUrls(response.data)
  },

  async createWine(data: CreateWineRequestDto): Promise<WineDetailsDto> {
    const response = await http.post<WineDetailsDto>(API_ENDPOINTS.WINES, data)
    return resolveWineAssetUrls(response.data)
  },

  async updateWine(id: string, data: UpdateWineRequestDto): Promise<WineDetailsDto> {
    const response = await http.patch<WineDetailsDto>(`${API_ENDPOINTS.WINES}/${id}`, data)
    return resolveWineAssetUrls(response.data)
  },

  async deleteWine(id: string): Promise<void> {
    await http.delete(`${API_ENDPOINTS.WINES}/${id}`)
  },

  async getSimilarWines(wineId: string, limit = 5): Promise<WineSummaryDto[]> {
    const response = await http.get<WineSummaryDto[]>(
      `${API_ENDPOINTS.WINES}/${wineId}/similar`,
      { params: { limit } },
    )
    return response.data.map(resolveWineAssetUrls)
  },

  async getRecommendedWines(limit = 10): Promise<WineSummaryDto[]> {
    const response = await http.get<WineSummaryDto[]>(
      `${API_ENDPOINTS.WINES}/recommended`,
      { params: { limit } },
    )
    return response.data.map(resolveWineAssetUrls)
  },

  async getPopularWines(limit = 10): Promise<WineSummaryDto[]> {
    const response = await http.get<WineSummaryDto[]>(
      `${API_ENDPOINTS.WINES}/popular`,
      { params: { limit } },
    )
    return response.data.map(resolveWineAssetUrls)
  },
}
