import { resolveCellarAssetUrls } from "@/infrastructure/api/resolveApiAssetUrl";
/**
 * Cellar API Client.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";
import type { CellarEntryDto, AddToCellarRequestDto, UpdateCellarEntryRequestDto } from "@/infrastructure/api/dto/cellar.dto";

export const cellarApiClient = {
  getCellar: (): Promise<CellarEntryDto[]> =>
    http.get<CellarEntryDto[]>("/cellar").then((r) => r.data.map(resolveCellarAssetUrls)),

  addWine: (payload: AddToCellarRequestDto): Promise<CellarEntryDto> =>
    http.post<CellarEntryDto>("/cellar", payload).then((r) => resolveCellarAssetUrls(r.data)),

  removeWine: (cellarWineId: string): Promise<void> =>
    http.delete(`/cellar/${cellarWineId}`).then(() => undefined),

  updateWine: (cellarWineId: string, payload: UpdateCellarEntryRequestDto): Promise<CellarEntryDto> =>
    http.patch<CellarEntryDto>(`/cellar/${cellarWineId}`, payload).then((r) => resolveCellarAssetUrls(r.data)),
};

