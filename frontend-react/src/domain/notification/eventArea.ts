/**
 * The area a user hears about new events in. Setting one opts them in to "new event near you"
 * pushes; clearing it opts them out. An approximate area is set from the mobile app and never
 * carries a location on the client.
 */
export const EVENT_AREA_KINDS = ['REGION', 'APPROXIMATE'] as const

export type EventAreaKind = (typeof EVENT_AREA_KINDS)[number]

export type EventArea =
  | { kind: 'REGION'; regionId: string; regionName: string | null }
  | { kind: 'APPROXIMATE' }

export function isEventAreaKind(value: string): value is EventAreaKind {
  return (EVENT_AREA_KINDS as readonly string[]).includes(value)
}

/** The region shown as selected; an approximate area or no area selects none. */
export function selectedRegionId(area: EventArea | null): string {
  return area?.kind === 'REGION' ? area.regionId : ''
}

/** Picking nothing, or the region already stored, changes nothing. */
export function isEventAreaChange(area: EventArea | null, regionId: string): boolean {
  return regionId !== '' && regionId !== selectedRegionId(area)
}
