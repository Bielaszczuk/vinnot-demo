import type { TFunction } from 'i18next'
import type { AdminRoute, AdminRoutePayload, AdminRouteStop } from '@domain/admin/admin.types'
import { isAdminRouteFormField, type AdminRouteFormField } from '@domain/admin/adminRouteForm'
import { normalizeError } from '@shared/utils/apiError'
import { adminSaveErrorMessage } from '@/presentation/feedback/apiErrorMessage'

export type { AdminRouteSaveResult } from '@domain/admin/adminRouteForm'

export const ADMIN_ROUTES_PAGE_SIZE = 20

export function createEmptyRouteDraft(): Partial<AdminRoute> {
  return {
    name: '',
    description: null,
    country: '',
    region: null,
    subregion: null,
    estimatedDuration: null,
    estimatedDays: null,
    totalDistance: null,
    difficulty: 'medium',
    imageUrl: null,
    mapEmbedUrl: null,
    status: 'draft',
    recommendedWineTypes: [],
    stops: [],
  }
}

/**
 * Save payload for a route. `editingRoute` is the stored route with the edited
 * fields on top, so fields the form does not show (map embed, recommended wine
 * types) keep their stored value instead of being cleared by the PATCH.
 */
export function buildAdminRoutePayload(editingRoute: Partial<AdminRoute>, editingStops: AdminRouteStop[]): AdminRoutePayload {
  return {
    name: editingRoute.name ?? '',
    description: editingRoute.description || null,
    country: editingRoute.country ?? '',
    region: editingRoute.region || null,
    subregion: editingRoute.subregion || null,
    estimatedDuration: editingRoute.estimatedDuration ?? null,
    estimatedDays: editingRoute.estimatedDays ?? null,
    totalDistance: editingRoute.totalDistance ?? null,
    difficulty: editingRoute.difficulty || null,
    imageUrl: editingRoute.imageUrl || null,
    mapEmbedUrl: editingRoute.mapEmbedUrl || null,
    status: editingRoute.status || 'draft',
    recommendedWineTypes: editingRoute.recommendedWineTypes ?? [],
    stops: editingStops,
  }
}

const MESSAGE_BY_CODE: Record<string, string> = {
  CANNOT_PUBLISH: 'admin.routes.form.errors.cannotPublish',
  INVALID_ROUTE_NAME: 'admin.routes.form.validation.nameRequired',
  E1001: 'admin.routes.form.errors.rejectedFields',
}

const FIELDS_BY_CODE: Record<string, AdminRouteFormField[]> = {
  CANNOT_PUBLISH: ['stops'],
  INVALID_ROUTE_NAME: ['name'],
}

const errorParts = (error: unknown) => (typeof error === 'object' && error !== null ? normalizeError(error) : null)

/** Backend validation keys such as `stops[0].name` point at the stops. */
const toFormField = (key: string): string => (key.startsWith('stops') ? 'stops' : key)

/** Form fields a failed save points at: backend validation details and route domain codes. */
export function adminRouteRejectedFields(error: unknown): AdminRouteFormField[] {
  const parts = errorParts(error)
  if (!parts) return []
  const fromDetails = Object.keys(parts.details ?? {}).map(toFormField).filter(isAdminRouteFormField)
  return [...new Set([...(FIELDS_BY_CODE[parts.code] ?? []), ...fromDetails])]
}

/** Route save failure copy: route-specific codes first, then the shared admin save message. */
export function adminRouteSaveErrorMessage(error: unknown, t: TFunction): string {
  const code = errorParts(error)?.code
  const key = code ? MESSAGE_BY_CODE[code] : undefined
  return key ? t(key) : adminSaveErrorMessage(error, t, 'routes')
}
