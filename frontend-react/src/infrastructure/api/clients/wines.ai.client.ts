import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import type {
  AiProfileDto,
  AiProfileStatusDto,
  CompareResultDto,
  WineScanResultDto,
} from '@api/dto/wines.dto'

const AI_GENERATION_TIMEOUT_MS = 120_000

export const winesAiClient = {
  async compareWines(wineAId: string, wineBId: string, language = 'es-AR'): Promise<CompareResultDto> {
    const response = await http.post<CompareResultDto>(
      `${API_ENDPOINTS.WINES}/compare`,
      { wineAId, wineBId, language },
      { timeout: AI_GENERATION_TIMEOUT_MS },
    )
    return response.data
  },

  async getAiProfile(wineId: string, language = 'es'): Promise<AiProfileDto> {
    const response = await http.get<AiProfileDto>(
      `${API_ENDPOINTS.WINES}/${wineId}/ai-profile`,
      { params: { language } },
    )
    return response.data
  },

  async getAiProfileStatus(wineId: string, language = 'es'): Promise<AiProfileStatusDto> {
    const response = await http.get<AiProfileStatusDto>(
      `${API_ENDPOINTS.WINES}/${wineId}/ai-profile/status`,
      { params: { language } },
    )
    return response.data
  },

  async generateAiProfile(wineId: string, language = 'es'): Promise<AiProfileDto> {
    const response = await http.post<AiProfileDto>(
      `${API_ENDPOINTS.WINES}/${wineId}/ai-profile`,
      { language },
      { timeout: AI_GENERATION_TIMEOUT_MS },
    )
    return response.data
  },

  async regenerateAiProfile(wineId: string, language = 'es'): Promise<AiProfileDto> {
    const response = await http.post<AiProfileDto>(
      `${API_ENDPOINTS.WINES}/${wineId}/ai-profile/generate`,
      undefined,
      { params: { language }, timeout: AI_GENERATION_TIMEOUT_MS },
    )
    return response.data
  },

  async scanWineLabel(imageFile: File | string): Promise<WineScanResultDto> {
    const formData = new FormData()
    if (typeof imageFile === 'string') {
      formData.append('imageBase64', imageFile)
    } else {
      formData.append('image', imageFile)
    }

    const response = await http.post<WineScanResultDto>(
      `${API_ENDPOINTS.WINES}/scan`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data
  },
}
