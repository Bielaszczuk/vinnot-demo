/**
 * Tasted vintage rules shared by reviews and cellar notes.
 * The catalog wine keeps its own vintage; this is the year the user actually tasted.
 */

/** Oldest vintage the API accepts. */
export const VINTAGE_MIN_YEAR = 1800;
/** Oldest year the picker offers. */
export const VINTAGE_PICKER_OLDEST_YEAR = 1900;

export interface VintageSuggestion {
  year: number;
  /** The catalog wine vintage, offered first. */
  suggested: boolean;
}

export function isValidVintage(year: unknown, currentYear = new Date().getFullYear()): year is number {
  return typeof year === "number" && Number.isInteger(year) && year >= VINTAGE_MIN_YEAR && year <= currentYear + 1;
}

/**
 * Every year the picker offers, newest first, from the current year down to 1900.
 * The catalog vintage leads the list, once, while it is inside that range.
 */
export function vintageOptions({
  suggestedYear,
  currentYear = new Date().getFullYear(),
}: {
  suggestedYear?: number | null;
  currentYear?: number;
}): VintageSuggestion[] {
  const offered =
    typeof suggestedYear === "number" &&
    Number.isInteger(suggestedYear) &&
    suggestedYear >= VINTAGE_PICKER_OLDEST_YEAR &&
    suggestedYear <= currentYear;
  const options: VintageSuggestion[] = offered ? [{ year: suggestedYear, suggested: true }] : [];
  for (let year = currentYear; year >= VINTAGE_PICKER_OLDEST_YEAR; year -= 1) {
    if (!offered || year !== suggestedYear) options.push({ year, suggested: false });
  }
  return options;
}

/** Keeps only the digits a typed vintage query can hold: four at most. */
export function vintageQueryDigits(text: string): string {
  return text.replace(/\D/g, "").slice(0, 4);
}

/**
 * A year matches when it starts with the typed digits. Exactly two digits also match
 * the year ending in them, so "98" finds 1998.
 */
export function vintageMatchesQuery(year: number, query: string): boolean {
  const text = String(year);
  return text.startsWith(query) || (query.length === 2 && text.endsWith(query));
}

/** The offered years matching the query, in their offered order. An empty query keeps them all. */
export function filterVintageOptions(options: VintageSuggestion[], query: string): VintageSuggestion[] {
  return query ? options.filter((option) => vintageMatchesQuery(option.year, query)) : options;
}

/** The year a complete four-digit query names while the picker offers it; otherwise null. */
export function completeVintageQuery(query: string, currentYear = new Date().getFullYear()): number | null {
  if (!/^\d{4}$/.test(query)) return null;
  const year = Number(query);
  return year >= VINTAGE_PICKER_OLDEST_YEAR && year <= currentYear ? year : null;
}

/**
 * Vintage to send on an update: undefined keeps the stored value, null clears it,
 * a year replaces it.
 */
export function vintageChange(initial: number | null, current: number | null): number | null | undefined {
  return initial === current ? undefined : current;
}

/** Update request fields for a vintage change, following the API keep-unless-clear contract. */
export function vintageUpdateFields(change: number | null | undefined): { vintage?: number; clearVintage?: true } {
  if (change === undefined) return {};
  return change === null ? { clearVintage: true } : { vintage: change };
}
