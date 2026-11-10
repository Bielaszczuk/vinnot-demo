/**
 * Cellar domain mappers.
 * @contract: keep in sync with frontend-react/src/domain/cellar/cellar.mappers.ts
 */
import type { CellarEntry, CellarWineInfo } from "./cellar.types";

type CellarEntryInput = {
  id: string;
  wine?: Record<string, unknown> | null;
  rating?: number | null;
  purchasePrice?: number | null;
  reviewId?: string | null;
  notes?: string | null;
  vintage?: number | null;
  addedAt: string;
};

export function mapCellarApiWineToInfo(w: Record<string, unknown>): CellarWineInfo {
  return {
    id: (w.id as string) ?? "",
    name: (w.name as string) ?? "",
    winery: (w.wineryName as string) ?? "",
    wineryId: (w.wineryId as string | null) ?? null,
    type: (w.wineType as string) ?? "",
    vintage: (w.vintage as number | null) ?? null,
    imageUrl: (w.imageUrl as string | null) ?? null,
    region: (w.region as string) ?? "",
    country: (w.country as string) ?? "",
    price: (w.priceMin as number | null) ?? null,
    rating: w.ratingAverage ? Number(w.ratingAverage) : null,
  };
}

export function mapCellarEntryFromDto(dto: CellarEntryInput): CellarEntry {
  return {
    id: dto.id,
    reviewId: dto.reviewId ?? null,
    wine: mapCellarApiWineToInfo(dto.wine ?? {}),
    rating: dto.rating ?? null,
    purchasePrice: dto.purchasePrice ?? null,
    notes: dto.notes ?? null,
    vintage: dto.vintage ?? null,
    addedAt: new Date(dto.addedAt),
  };
}
