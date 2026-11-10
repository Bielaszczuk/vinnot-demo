/**
 * Reference data API client (DB-backed catalogs such as wine types).
 * @architecture: Capa 4 — Infraestructura HTTP
 * @contract: GET /reference/wine-types → ReferenceDataResponse[]
 */
import { http } from "@/infrastructure/api/http";

export interface ReferenceDataDto {
  code: string;
  nameEs: string;
  nameEn: string;
}

export const referenceClient = {
  getWineTypes: (): Promise<ReferenceDataDto[]> =>
    http.get<ReferenceDataDto[]>("/reference/wine-types").then((r) => r.data),
};
