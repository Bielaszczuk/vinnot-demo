/**
 * Cellar domain types.
 * @contract: keep in sync with frontend-react/src/domain/cellar/cellar.types.ts
 */

export interface CellarEntry {
  id: string;
  wine: CellarWineInfo;
  rating: number | null;
  purchasePrice: number | null;
  notes: string | null;
  /** Tasted vintage; `wine.vintage` is the catalog vintage. */
  vintage: number | null;
  reviewId?: string | null;
  addedAt: Date;
}

/** Lightweight wine info embedded in a cellar entry */
export interface CellarWineInfo {
  id: string;
  name: string;
  winery: string;
  wineryId: string | null;
  type: string;
  vintage: number | null;
  imageUrl: string | null;
  region: string;
  country: string;
  price: number | null;
  rating: number | null;
}

export interface AddToCellarOptions {
  wineId: string;
  rating?: number | null;
  purchasePrice?: number | null;
  notes?: string | null;
  vintage?: number | null;
}

export interface UpdateCellarEntryOptions {
  rating?: number | null;
  purchasePrice?: number | null;
  notes?: string | null;
  /** Undefined keeps the stored vintage, null clears it, a year replaces it. */
  vintage?: number | null;
}
