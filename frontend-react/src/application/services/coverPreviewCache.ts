/**
 * Session memory for private cover images: a cover already shown (or just
 * uploaded) opens again without another authenticated download.
 * Memory only, never disk; cleared when the session ends or changes.
 */
const LIMIT = 40;

export function createCoverPreviewCache<T>() {
  const entries = new Map<string, T>();
  return {
    get(url: string): T | undefined {
      const value = entries.get(url);
      if (value === undefined) return undefined;
      entries.delete(url);
      entries.set(url, value);
      return value;
    },
    put(url: string, value: T) {
      entries.delete(url);
      entries.set(url, value);
      if (entries.size > LIMIT) entries.delete(entries.keys().next().value as string);
    },
    clear() { entries.clear(); },
  };
}
