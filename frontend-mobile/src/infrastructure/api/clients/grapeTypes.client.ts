/**
 * Grape Types API Client.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";

export interface GrapeTypeDto {
  id: string;
  name: string;
}

export const grapeTypesClient = {
  getGrapeTypes: (): Promise<GrapeTypeDto[]> =>
    http.get<GrapeTypeDto[]>("/grape-types").then((r) => r.data),
};
