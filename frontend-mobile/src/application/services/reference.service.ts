/**
 * Reference data service: maps the backend catalogs to domain options.
 * @architecture: Capa 3 — Aplicación
 */
import { referenceClient } from "@/infrastructure/api/clients/reference.client";
import { toWineType } from "@/domain/wine/wine.types";
import type { WineTypeOption } from "@/domain/wine/wine.types";

export const referenceService = {
  /** Active wine types in catalog order; codes the app does not know are left out. */
  async getWineTypes(): Promise<WineTypeOption[]> {
    const dtos = await referenceClient.getWineTypes();
    return dtos.flatMap((dto) => {
      const value = toWineType(dto.code);
      return value ? [{ value, nameEs: dto.nameEs, nameEn: dto.nameEn }] : [];
    });
  },
};
