/**
 * Cellar DTOs
 *
 * Data Transfer Objects for cellar API endpoints.
 * These represent the exact shape of data sent to/from the backend.
 */

/**
 * Cellar entry as returned by the backend.
 * The `wine` field is a flat record with wine properties.
 */
export interface CellarEntryDto {
  id: string
  wine: Record<string, unknown>
  rating: number | null
  purchasePrice: number | null
  notes: string | null
  /** Tasted vintage; the nested `wine.vintage` is the catalog vintage. */
  vintage?: number | null
  reviewId?: string | null
  addedAt: string
}

/**
 * Request body for adding a wine to the cellar
 */
export interface AddToCellarRequestDto {
  wineId: string
  rating: number | null
  purchasePrice: number | null
  notes: string | null
  vintage?: number
}

/**
 * Request body for updating a cellar entry
 */
export interface UpdateCellarEntryRequestDto {
  rating: number | null
  purchasePrice: number | null
  notes: string | null
  /** Replaces the stored vintage; `clearVintage` removes it; neither keeps it. */
  vintage?: number
  clearVintage?: boolean
}

