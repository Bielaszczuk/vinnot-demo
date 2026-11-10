import type { CellarEntry } from "./cellar.types";

export interface CellarTypeShare {
  /** Upper-case wine type, e.g. `RED`. */
  type: string;
  count: number;
}

export interface CellarSummary {
  wineCount: number;
  /** Average of the entries the person rated, or null when none is rated. */
  averageRating: number | null;
  /** Distinct regions, compared case- and space-insensitively. */
  regionCount: number;
  /** Wine types from the most to the least common. */
  typeMix: CellarTypeShare[];
}

/** Headline figures of a cellar. The purchase price is stored but never summarized. */
export function summarizeCellar(entries: CellarEntry[]): CellarSummary {
  const ratings = entries
    .map((entry) => entry.rating)
    .filter((rating): rating is number => rating != null && rating > 0);
  const regions = new Set(
    entries.map((entry) => entry.wine.region.trim().toLowerCase()).filter(Boolean),
  );
  const types = new Map<string, number>();
  for (const entry of entries) {
    const type = entry.wine.type.trim().toUpperCase();
    if (type) types.set(type, (types.get(type) ?? 0) + 1);
  }
  return {
    wineCount: entries.length,
    averageRating: ratings.length
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : null,
    regionCount: regions.size,
    typeMix: [...types.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((left, right) => right.count - left.count),
  };
}
