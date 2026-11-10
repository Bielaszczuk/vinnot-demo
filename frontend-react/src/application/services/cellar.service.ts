import { cellarClient } from '@api/clients/cellar.client'
import { mapCellarEntryFromDto, mapCellarEntryFromDtoWithFallback } from '@domain/cellar/cellar.mappers'
import type { AddToCellarOptions, CellarWine, UpdateCellarEntryOptions } from '@domain/cellar/cellar.types'
import { toVintageCreateFields, toVintagePatchFields } from '@domain/wine/wine.vintage'
import type { Wine } from '@domain/wine/wine.types'

/**
 * Cellar service
 *
 * Orchestrates cellar API calls through the client layer
 * and transforms DTOs to domain models using mappers.
 */
export const cellarService = {
  /**
   * Fetch all cellar entries for the current user
   */
  async fetchCellar(): Promise<CellarWine[]> {
    const entries = await cellarClient.getCellar()
    return entries.map(mapCellarEntryFromDto)
  },

  /**
   * Add a wine to the cellar
   */
  async addWine(
    wine: Wine,
    options?: AddToCellarOptions,
  ): Promise<CellarWine> {
    const dto = await cellarClient.addWine({
      wineId: wine.id,
      rating: options?.rating ?? null,
      purchasePrice: options?.purchasePrice ?? null,
      notes: options?.notes ?? null,
      ...toVintageCreateFields(options?.vintage),
    })
    return mapCellarEntryFromDtoWithFallback(dto, wine)
  },

  /**
   * Remove a wine from the cellar
   */
  async removeWine(cellarWineId: string): Promise<void> {
    await cellarClient.removeWine(cellarWineId)
  },

  /**
   * Update a cellar entry
   */
  async updateWine(
    cellarWineId: string,
    updates: UpdateCellarEntryOptions,
  ): Promise<CellarWine> {
    const dto = await cellarClient.updateWine(cellarWineId, {
      rating: updates.rating ?? null,
      purchasePrice: updates.purchasePrice ?? null,
      notes: updates.notes ?? null,
      ...toVintagePatchFields(updates.vintage),
    })
    return mapCellarEntryFromDto(dto)
  },

  /**
   * Quick-add a wine to the cellar using only its ID.
   * Used by CellarQuickAddModal from the wine module.
   */
  async quickAddWine({ vintage, ...payload }: {
    wineId: string
    rating: number | null
    purchasePrice: number | null
    notes: string | null
    vintage?: number | null
  }): Promise<CellarWine> {
    const dto = await cellarClient.addWine({ ...payload, ...toVintageCreateFields(vintage) })
    return mapCellarEntryFromDto(dto)
  },
}

export default cellarService

