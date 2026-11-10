/**
 * Cellar domain types
 */

import type { Wine } from '@domain/wine/wine.types'

export interface CellarWine {
  id: string
  wine: Wine
  rating: number | null
  purchasePrice: number | null
  notes: string | null
  /** Vintage the user tasted; independent from the catalog `wine.vintage`. */
  vintage: number | null
  reviewId?: string | null
  addedAt: Date
}

export interface AddToCellarOptions {
  rating?: number | null
  purchasePrice?: number | null
  notes?: string | null
  vintage?: number | null
}

export interface UpdateCellarEntryOptions {
  rating?: number | null
  purchasePrice?: number | null
  notes?: string | null
  /** A year sets the vintage, `null` clears it, `undefined` keeps the stored one. */
  vintage?: number | null
}

