/**
 * Admin wine route stops — building, numbering and ordering the stops of a
 * route, and the map query that previews them.
 */

import type { AdminRouteStop, AdminWinery } from './admin.types'

export type GeneratedRouteQuery =
  | string
  | {
      origin: string
      destination: string
      waypoints: string[]
    }
  | null

export interface AdminRouteStopDraft {
  name: string
  type: string
  address: string
  /** Minutes at the stop; `null` while the field is empty. */
  estimatedDuration: number | null
}

export const DEFAULT_MANUAL_STOP_MINUTES = 30
export const DEFAULT_WINERY_STOP_MINUTES = 60

export function createEmptyRouteStopDraft(): AdminRouteStopDraft {
  return { name: '', type: 'winery', address: '', estimatedDuration: DEFAULT_MANUAL_STOP_MINUTES }
}

export function buildWineryGeocodeQuery(winery: AdminWinery): string {
  const parts = [winery.name]
  if (winery.regionName) parts.push(winery.regionName)
  if (winery.countryName) parts.push(winery.countryName)
  return parts.join(', ')
}

export function createWineryRouteStop(winery: AdminWinery, description: string, stopOrder: number): AdminRouteStop {
  return {
    name: winery.name,
    description,
    type: 'winery',
    address: winery.address || '',
    latitude: winery.latitude ?? null,
    longitude: winery.longitude ?? null,
    stopOrder,
    estimatedDuration: DEFAULT_WINERY_STOP_MINUTES,
  }
}

export function createManualRouteStop(draft: AdminRouteStopDraft, stopOrder: number): AdminRouteStop {
  return {
    name: draft.name.trim(),
    description: '',
    type: draft.type || 'winery',
    address: draft.address || '',
    latitude: null,
    longitude: null,
    stopOrder,
    estimatedDuration: draft.estimatedDuration ?? DEFAULT_MANUAL_STOP_MINUTES,
  }
}

export function reorderRouteStops(stops: AdminRouteStop[]): AdminRouteStop[] {
  return stops.map((stop, index) => ({ ...stop, stopOrder: index + 1 }))
}

export function removeRouteStopAt(stops: AdminRouteStop[], index: number): AdminRouteStop[] {
  return reorderRouteStops(stops.filter((_, stopIndex) => stopIndex !== index))
}

export function moveRouteStop(stops: AdminRouteStop[], index: number, direction: 'up' | 'down'): AdminRouteStop[] {
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= stops.length) return stops

  const nextStops = [...stops]
  ;[nextStops[index], nextStops[swapIndex]] = [nextStops[swapIndex]!, nextStops[index]!]
  return reorderRouteStops(nextStops)
}

/** Stops in their saved order; stops without an order keep their place. */
export function sortRouteStops(stops: readonly AdminRouteStop[] | undefined): AdminRouteStop[] {
  return stops ? [...stops].sort((a, b) => a.stopOrder - b.stopOrder) : []
}

export function resolveGeneratedRouteQuery(editingStops: AdminRouteStop[]): GeneratedRouteQuery {
  const wineryStops = editingStops.filter((stop) => stop.type === 'winery' && (stop.latitude ?? stop.name))

  if (wineryStops.length === 0) return null
  if (wineryStops.length === 1) return wineryStops[0]?.name ?? null

  const first = wineryStops[0]!
  const last = wineryStops[wineryStops.length - 1]!
  const toPoint = (stop: AdminRouteStop) =>
    stop.latitude && stop.longitude ? `${stop.latitude},${stop.longitude}` : stop.name

  return {
    origin: toPoint(first),
    destination: toPoint(last),
    waypoints: wineryStops.slice(1, -1).map(toPoint),
  }
}
