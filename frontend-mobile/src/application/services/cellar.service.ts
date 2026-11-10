/**
 * Cellar Service.
 * @architecture: Capa 3 — Aplicación
 */
import { cellarApiClient } from "@/infrastructure/api/clients/cellar.client";
import { mapCellarEntryFromDto } from "@/domain/cellar/cellar.mappers";
import { vintageUpdateFields } from "@/domain/wine/vintage";
import type { CellarEntry, AddToCellarOptions, UpdateCellarEntryOptions } from "@/domain/cellar/cellar.types";

export const cellarService = {
  async getCellar(): Promise<CellarEntry[]> {
    const entries = await cellarApiClient.getCellar();
    return entries.map(mapCellarEntryFromDto);
  },

  async addWine(options: AddToCellarOptions): Promise<CellarEntry> {
    const dto = await cellarApiClient.addWine({
      wineId: options.wineId,
      rating: options.rating ?? null,
      purchasePrice: options.purchasePrice ?? null,
      notes: options.notes ?? null,
      // Sent only when chosen, so a wine added without a vintage keeps the previous request body.
      ...(options.vintage != null ? { vintage: options.vintage } : {}),
    });
    return mapCellarEntryFromDto(dto);
  },

  async removeWine(cellarEntryId: string): Promise<void> {
    await cellarApiClient.removeWine(cellarEntryId);
  },

  async updateWine(cellarEntryId: string, updates: UpdateCellarEntryOptions): Promise<CellarEntry> {
    const dto = await cellarApiClient.updateWine(cellarEntryId, {
      rating: updates.rating ?? null,
      purchasePrice: updates.purchasePrice ?? null,
      notes: updates.notes ?? null,
      ...vintageUpdateFields(updates.vintage),
    });
    return mapCellarEntryFromDto(dto);
  },
};

