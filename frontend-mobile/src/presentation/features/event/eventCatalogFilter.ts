import type { Event, EventType } from "@/domain/event/event.types";

export type EventCatalogFilter = {
  search?: string;
  type?: EventType | "ALL";
  country?: string;
  ignoreCountry?: boolean;
};

export function filterEventCatalog(
  events: Event[],
  filter: EventCatalogFilter,
): Event[] {
  const normalizedSearch = normalizeEventSearch(filter.search ?? "");
  const normalizedCountry = normalizeEventSearch(filter.country ?? "");

  return events.filter((event) => {
    if (filter.type && filter.type !== "ALL" && event.type !== filter.type) {
      return false;
    }

    if (
      !filter.ignoreCountry &&
      normalizedCountry &&
      !matchesLocationValue(event.location.country, normalizedCountry)
    ) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return eventSearchValues(event).some((value) =>
      normalizeEventSearch(value).includes(normalizedSearch),
    );
  });
}

export function normalizeEventSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function matchesLocationValue(
  candidate: string | undefined,
  normalizedFilter: string,
): boolean {
  const normalizedCandidate = normalizeEventSearch(candidate ?? "");
  if (!normalizedCandidate) {
    return false;
  }

  return (
    normalizedCandidate.includes(normalizedFilter) ||
    normalizedFilter.includes(normalizedCandidate)
  );
}

function eventSearchValues(event: Event): string[] {
  return [
    event.title,
    event.description,
    event.location.name,
    event.location.address,
    event.location.city,
    event.location.region,
    event.location.country,
    event.organizer.name,
  ].filter((value): value is string => Boolean(value));
}
