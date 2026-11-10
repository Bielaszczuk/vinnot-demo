type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * The public wine API never reports more than this many results per search
 * (backend `PublicWineCatalogAccessPolicy.MAX_RESULT_WINDOW`, anti-scraping #431).
 * A total at the window is a floor, not the real size.
 */
export const PUBLIC_RESULT_WINDOW = 500;

interface CatalogCountInput {
  total: number;
  /** Any filter or search is narrowing the catalog. */
  filtered: boolean;
  /** Set when the country is the only active filter. */
  country?: string;
  t: Translate;
  format: (value: number) => string;
}

/**
 * Subtitle for the wine list. A filtered result is tied to its filter, and a
 * total at the API window reads as "more than", so no figure looks like the
 * total number of wines Vinnot has.
 */
export function catalogCountLabel({ total, filtered, country, t, format }: CatalogCountInput): string {
  const capped = total >= PUBLIC_RESULT_WINDOW;
  const count = { count: total, formatted: format(total) };
  if (filtered) {
    if (country) {
      return t(capped ? "wines.countInCountryMany" : "wines.countInCountry", { ...count, country });
    }
    return t(capped ? "wines.matchingCountMany" : "wines.matchingCount", count);
  }
  return capped ? t("wines.catalogCountMany") : t("wines.catalogCountExact", count);
}

interface WineListFilters {
  search: string;
  type: string | null | undefined;
  grape: string;
  country: string;
  region: string;
}

interface WineListSubtitleInput {
  status: { isError: boolean; isLoading: boolean; hasData: boolean };
  total: number;
  filters: WineListFilters;
  t: Translate;
  format: (value: number) => string;
}

/**
 * Subtitle of the wine list for every state: a failed or loading first page has
 * no count yet; afterwards the count follows `catalogCountLabel`.
 */
export function wineListSubtitle({ status, total, filters, t, format }: WineListSubtitleInput): string {
  if (!status.hasData) {
    if (status.isError) return t("wines.loadError");
    if (status.isLoading) return t("wines.searching");
  }
  const search = filters.search.trim();
  const narrowedBeyondCountry = !!(search || filters.type || filters.grape || filters.region);
  return catalogCountLabel({
    total,
    filtered: narrowedBeyondCountry || !!filters.country,
    country: filters.country && !narrowedBeyondCountry ? filters.country : undefined,
    t,
    format,
  });
}
