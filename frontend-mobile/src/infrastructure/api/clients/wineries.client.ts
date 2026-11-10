/**
 * Wineries API Client.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";
import type {
  WineryDetailsDto,
  WineryFilterParamsDto,
  WineriesPageResponseDto,
  UpdateWineryCoordinatesRequestDto,
} from "@/infrastructure/api/dto/wineries.dto";

export const wineriesApiClient = {
  getWineries: (params?: WineryFilterParamsDto): Promise<WineriesPageResponseDto> =>
    http.get<WineriesPageResponseDto>("/wineries", { params }).then((r) => r.data),

  getWinery: (id: string): Promise<WineryDetailsDto> =>
    http.get<WineryDetailsDto>(`/wineries/${id}`).then((r) => r.data),

  updateCoordinates: (id: string, payload: UpdateWineryCoordinatesRequestDto): Promise<void> =>
    http.patch(`/wineries/${id}/coordinates`, payload).then(() => undefined),
};
