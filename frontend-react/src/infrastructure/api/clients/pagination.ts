export interface PaginatedSlice<T> {
  items: T[];
  totalItems: number;
}

export function normalizePaginated<T>(raw: Record<string, unknown>): PaginatedSlice<T> {
  const data = (raw.data ?? raw) as Record<string, unknown>;
  return {
    items: (data.items ?? data.content ?? []) as T[],
    totalItems: (data.totalItems ?? data.totalElements ?? 0) as number,
  };
}
