/**
 * The area a user hears about new events in: a catalogue region, or an approximate location the server
 * rounds to about 11 km and never returns.
 */
export const EVENT_AREA_KINDS = ["REGION", "APPROXIMATE"] as const;

export type EventAreaKind = (typeof EVENT_AREA_KINDS)[number];

/**
 * `placeName` is only known right after the user picked a place on the map: the server keeps the rounded point,
 * not its name, so a later read shows a generic approximate area.
 */
export type EventArea =
  | { kind: "REGION"; regionId: string; regionName: string }
  | { kind: "APPROXIMATE"; placeName?: string };

export interface EventAreaRegion {
  id: string;
  name: string;
}

export interface SearchableRegion {
  name: string;
  countryName: string;
}

export const REGION_SEARCH_MIN_LENGTH = 2;
export const REGION_SEARCH_LIMIT = 8;

function searchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** A query long enough to search the catalogue (and the map when the catalogue has no match). */
export function isRegionQuery(query: string): boolean {
  return searchKey(query).length >= REGION_SEARCH_MIN_LENGTH;
}

/**
 * Catalogue regions matching the query, ignoring case and accents: names starting with it first, then names or
 * countries containing it, at most {@link REGION_SEARCH_LIMIT}.
 */
export function matchRegions<T extends SearchableRegion>(regions: readonly T[], query: string): T[] {
  if (!isRegionQuery(query)) return [];
  const key = searchKey(query);
  const starting: T[] = [];
  const containing: T[] = [];
  for (const region of regions) {
    const name = searchKey(region.name);
    if (name.startsWith(key)) starting.push(region);
    else if (name.includes(key) || searchKey(region.countryName).includes(key)) containing.push(region);
  }
  return [...starting, ...containing].slice(0, REGION_SEARCH_LIMIT);
}

export function isEventAreaKind(value: string): value is EventAreaKind {
  return (EVENT_AREA_KINDS as readonly string[]).includes(value);
}

/**
 * Rounds a coordinate to a tenth of a degree (about 11 km) before it leaves the device, matching the server's rounding,
 * so a precise position is never sent.
 */
export function toApproximateCoordinate(value: number): number {
  return Math.round(value * 10) / 10;
}

export function isSelectedRegion(area: EventArea | null, regionId: string): boolean {
  return area?.kind === "REGION" && area.regionId === regionId;
}
