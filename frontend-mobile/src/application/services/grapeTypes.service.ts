/**
 * Grape Types Service.
 * @architecture: Capa 3 — Aplicación
 */
import { grapeTypesClient, type GrapeTypeDto } from "@/infrastructure/api/clients/grapeTypes.client";

export interface GrapeType {
  id: string;
  name: string;
}

function mapGrapeType(dto: GrapeTypeDto): GrapeType {
  return { id: dto.id, name: dto.name };
}

export const grapeTypesService = {
  async getGrapeTypes(): Promise<GrapeType[]> {
    const dtos = await grapeTypesClient.getGrapeTypes();
    return dtos.map(mapGrapeType);
  },
};
