/**
 * Admin wine route form — the values the route editor holds and the rules
 * they and the route stops follow.
 *
 * Text fields hold strings (empty when missing) so inputs stay controlled; the
 * draft handed to the save payload builder turns empty optional text back into
 * `null`. Limits mirror `CreateRouteAdminRequest` and `AddStopAdminRequest`.
 */

import type { AdminRoute, AdminRouteStop } from './admin.types'

export const MAX_ROUTE_NAME_LENGTH = 255
export const MAX_ROUTE_DESCRIPTION_LENGTH = 20000
export const MAX_ROUTE_PLACE_LENGTH = 100
export const MAX_ROUTE_IMAGE_URL_LENGTH = 500
export const MAX_ROUTE_STOPS = 100
export const MAX_ROUTE_STOP_NAME_LENGTH = 255
export const MAX_ROUTE_STOP_ADDRESS_LENGTH = 500

export const ADMIN_ROUTE_STATUSES = ['draft', 'active', 'archived'] as const
export const ADMIN_ROUTE_DIFFICULTIES = ['short', 'medium', 'long'] as const
export const ADMIN_ROUTE_STOP_TYPES = ['winery', 'restaurant', 'viewpoint', 'attraction', 'accommodation'] as const

/** Status the backend only accepts on a route that has stops. */
const PUBLISHED_STATUS = 'active'

export interface AdminRouteFormValues {
  name: string
  description: string
  /** Country name, as the route stores it. */
  country: string
  /** Region name, as the route stores it. */
  region: string
  subregion: string
  status: string
  difficulty: string
  estimatedDays: number | null
  totalDistance: number | null
  estimatedDuration: number | null
  /** The minutes follow the sum of the stop minutes until someone types them by hand. */
  durationFromStops: boolean
  imageUrl: string | null
}

export type AdminRouteFormField = keyof AdminRouteFormValues | 'stops'

export type AdminRouteFormErrorCode =
  | 'nameRequired'
  | 'nameTooLong'
  | 'descriptionTooLong'
  | 'countryRequired'
  | 'placeTooLong'
  | 'daysInteger'
  | 'distanceRange'
  | 'minutesInteger'
  | 'imageUrlTooLong'
  | 'stopsRequiredToPublish'
  | 'tooManyStops'

export interface AdminRouteFormError {
  field: AdminRouteFormField
  code: AdminRouteFormErrorCode
}

export type AdminRouteStopErrorCode = 'stopNameRequired' | 'stopNameTooLong' | 'stopAddressTooLong' | 'stopDurationInteger'

export interface AdminRouteStopError {
  index: number
  field: 'name' | 'address' | 'estimatedDuration'
  code: AdminRouteStopErrorCode
}

/** Outcome of a route save, so the editor can flag the fields the backend rejected. */
export type AdminRouteSaveResult = { saved: true } | { saved: false; rejectedFields: AdminRouteFormField[] }

export const ADMIN_ROUTE_FORM_FIELDS: readonly AdminRouteFormField[] = [
  'name', 'description', 'country', 'region', 'subregion', 'status', 'difficulty',
  'estimatedDays', 'totalDistance', 'estimatedDuration', 'durationFromStops', 'imageUrl', 'stops',
]

export function isAdminRouteFormField(field: string): field is AdminRouteFormField {
  return (ADMIN_ROUTE_FORM_FIELDS as readonly string[]).includes(field)
}

export function toAdminRouteFormValues(route: Partial<AdminRoute>): AdminRouteFormValues {
  return {
    name: route.name ?? '',
    description: route.description ?? '',
    country: route.country ?? '',
    region: route.region ?? '',
    subregion: route.subregion ?? '',
    status: route.status || 'draft',
    difficulty: route.difficulty ?? '',
    estimatedDays: route.estimatedDays ?? null,
    totalDistance: route.totalDistance ?? null,
    estimatedDuration: route.estimatedDuration ?? null,
    durationFromStops: true,
    imageUrl: route.imageUrl ?? null,
  }
}

export function routeStopsMinutes(stops: readonly AdminRouteStop[]): number {
  return stops.reduce((sum, stop) => sum + (stop.estimatedDuration || 0), 0)
}

/** Minutes the route saves: the stop total while it follows the stops, otherwise the typed value. */
export function resolveRouteMinutes(values: AdminRouteFormValues, stops: readonly AdminRouteStop[]): number | null {
  const fromStops = routeStopsMinutes(stops)
  return values.durationFromStops && fromStops > 0 ? fromStops : values.estimatedDuration
}

/** The route fields the save payload builder reads; the rest of the stored route is kept as it is. */
export function toAdminRouteDraft(values: AdminRouteFormValues, stops: readonly AdminRouteStop[]): Partial<AdminRoute> {
  return {
    name: values.name.trim(),
    description: values.description || null,
    country: values.country,
    region: values.region || null,
    subregion: values.subregion || null,
    status: values.status || 'draft',
    difficulty: values.difficulty || null,
    estimatedDays: values.estimatedDays,
    totalDistance: values.totalDistance,
    estimatedDuration: resolveRouteMinutes(values, stops),
    imageUrl: values.imageUrl || null,
  }
}

const isPositiveInteger = (value: number) => Number.isInteger(value) && value >= 1

export function validateAdminRouteDraft(values: AdminRouteFormValues, stops: readonly AdminRouteStop[]): AdminRouteFormError[] {
  const errors: AdminRouteFormError[] = []
  const push = (field: AdminRouteFormField, code: AdminRouteFormErrorCode) => errors.push({ field, code })
  const name = values.name.trim()
  if (!name) push('name', 'nameRequired')
  else if (name.length > MAX_ROUTE_NAME_LENGTH) push('name', 'nameTooLong')
  if (values.description.length > MAX_ROUTE_DESCRIPTION_LENGTH) push('description', 'descriptionTooLong')
  if (!values.country) push('country', 'countryRequired')
  else if (values.country.length > MAX_ROUTE_PLACE_LENGTH) push('country', 'placeTooLong')
  if (values.region.length > MAX_ROUTE_PLACE_LENGTH) push('region', 'placeTooLong')
  if (values.subregion.length > MAX_ROUTE_PLACE_LENGTH) push('subregion', 'placeTooLong')
  if (values.estimatedDays != null && !isPositiveInteger(values.estimatedDays)) push('estimatedDays', 'daysInteger')
  if (values.totalDistance != null && !(values.totalDistance >= 0)) push('totalDistance', 'distanceRange')
  const followsStops = values.durationFromStops && routeStopsMinutes(stops) > 0
  if (!followsStops && values.estimatedDuration != null && !isPositiveInteger(values.estimatedDuration)) {
    push('estimatedDuration', 'minutesInteger')
  }
  if ((values.imageUrl?.length ?? 0) > MAX_ROUTE_IMAGE_URL_LENGTH) push('imageUrl', 'imageUrlTooLong')
  if (values.status === PUBLISHED_STATUS && stops.length === 0) push('stops', 'stopsRequiredToPublish')
  if (stops.length > MAX_ROUTE_STOPS) push('stops', 'tooManyStops')
  return errors
}

export function validateAdminRouteStops(stops: readonly AdminRouteStop[]): AdminRouteStopError[] {
  const errors: AdminRouteStopError[] = []
  stops.forEach((stop, index) => {
    const name = stop.name.trim()
    if (!name) errors.push({ index, field: 'name', code: 'stopNameRequired' })
    else if (name.length > MAX_ROUTE_STOP_NAME_LENGTH) errors.push({ index, field: 'name', code: 'stopNameTooLong' })
    if ((stop.address?.length ?? 0) > MAX_ROUTE_STOP_ADDRESS_LENGTH) errors.push({ index, field: 'address', code: 'stopAddressTooLong' })
    if (!isPositiveInteger(stop.estimatedDuration)) errors.push({ index, field: 'estimatedDuration', code: 'stopDurationInteger' })
  })
  return errors
}
