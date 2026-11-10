import type { TFunction } from 'i18next'
import type { AdminWinery, AdminWineryPayload } from '@domain/admin/admin.types'
import { isAdminWineryFormField, type AdminWineryFormField } from '@domain/admin/adminWineryForm'
import { normalizeError } from '@shared/utils/apiError'
import { adminSaveErrorMessage } from '@/presentation/feedback/apiErrorMessage'

export type { AdminWinerySaveResult } from '@domain/admin/adminWineryForm'

export const ADMIN_WINERIES_PAGE_SIZE = 20

export function createEmptyWineryDraft(): Partial<AdminWinery> {
  return {
    name: '',
    countryId: null,
    regionId: null,
    subregion: null,
    descriptionEs: null,
    descriptionEn: null,
    address: null,
    latitude: null,
    longitude: null,
    email: null,
    phone: null,
    website: null,
    logoUrl: null,
    imageUrl: null,
    establishedYear: null,
  }
}

export function buildWineryGeocodeQuery(winery: AdminWinery): string {
  const parts = [winery.name]
  if (winery.regionName) parts.push(winery.regionName)
  if (winery.countryName) parts.push(winery.countryName)
  return parts.join(', ')
}

export function buildAdminWineryPayload(editingWinery: Partial<AdminWinery>): AdminWineryPayload {
  return {
    name: editingWinery.name ?? '',
    countryId: editingWinery.countryId ?? '',
    regionId: editingWinery.regionId || null,
    subregion: editingWinery.subregion || null,
    descriptionEs: editingWinery.descriptionEs || null,
    descriptionEn: editingWinery.descriptionEn || null,
    address: editingWinery.address || null,
    latitude: editingWinery.latitude ?? null,
    longitude: editingWinery.longitude ?? null,
    email: editingWinery.email || null,
    phone: editingWinery.phone || null,
    website: editingWinery.website || null,
    logoUrl: editingWinery.logoUrl || null,
    imageUrl: editingWinery.imageUrl || null,
    establishedYear: editingWinery.establishedYear ?? null,
  }
}

const MESSAGE_BY_CODE: Record<string, string> = {
  INVALID_COORDINATES: 'admin.wineries.form.errors.invalidCoordinates',
  INVALID_WINERY_NAME: 'admin.wineries.form.validation.nameRequired',
  E1001: 'admin.wineries.form.errors.rejectedFields',
}

const FIELDS_BY_CODE: Record<string, AdminWineryFormField[]> = {
  INVALID_COORDINATES: ['latitude', 'longitude'],
  INVALID_WINERY_NAME: ['name'],
}

const errorParts = (error: unknown) => (typeof error === 'object' && error !== null ? normalizeError(error) : null)

/** Form fields a failed save points at: backend validation details and winery domain codes. */
export function adminWineryRejectedFields(error: unknown): AdminWineryFormField[] {
  const parts = errorParts(error)
  if (!parts) return []
  const fromDetails = Object.keys(parts.details ?? {}).filter(isAdminWineryFormField)
  return [...new Set([...(FIELDS_BY_CODE[parts.code] ?? []), ...fromDetails])]
}

/** Winery save failure copy: winery-specific codes first, then the shared admin save message. */
export function adminWinerySaveErrorMessage(error: unknown, t: TFunction): string {
  const code = errorParts(error)?.code
  const key = code ? MESSAGE_BY_CODE[code] : undefined
  return key ? t(key) : adminSaveErrorMessage(error, t, 'wineries')
}
