/**
 * Cellar DTOs — match backend response shapes exactly.
 * @contract: keep in sync with frontend-react/src/api/dto/cellar.dto.ts
 */

export interface CellarEntryDto {
  id: string;
  wine: Record<string, unknown>;
  rating: number | null;
  purchasePrice: number | null;
  notes: string | null;
  /** Tasted vintage; the nested wine vintage is the catalog one. */
  vintage?: number | null;
  reviewId?: string | null;
  addedAt: string;
}

export interface AddToCellarRequestDto {
  wineId: string;
  rating: number | null;
  purchasePrice: number | null;
  notes: string | null;
  /** Sent only when the user chose a vintage. */
  vintage?: number;
}

/** PATCH keeps the stored vintage unless a new one is sent or clearVintage is true. */
export interface UpdateCellarEntryRequestDto {
  rating: number | null;
  purchasePrice: number | null;
  notes: string | null;
  vintage?: number;
  clearVintage?: boolean;
}

