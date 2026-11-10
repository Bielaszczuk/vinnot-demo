/**
 * Admin winery form — the values the winery editor holds and the rules they follow.
 *
 * Text fields hold strings (empty when missing) so inputs stay controlled; the
 * draft handed to the save payload builder turns empty optional text back into
 * `null`. Limits mirror `CreateWineryAdminRequest` on the backend.
 */

import type { AdminWinery } from './admin.types'

export const MAX_WINERY_NAME_LENGTH = 255
export const MAX_WINERY_DESCRIPTION_LENGTH = 20000
export const MAX_WINERY_SUBREGION_LENGTH = 100
export const MAX_WINERY_ADDRESS_LENGTH = 500
export const MAX_WINERY_EMAIL_LENGTH = 255
export const MAX_WINERY_PHONE_LENGTH = 50
/** Imported wineries keep local formats such as (0261) 412-3456, so only the characters are checked. */
const PHONE_CHARACTERS = /^[0-9 +()-]*$/
export const MAX_WINERY_URL_LENGTH = 500
export const MIN_WINERY_ESTABLISHED_YEAR = 1000

export interface AdminWineryFormValues {
  name: string
  descriptionEs: string
  descriptionEn: string
  establishedYear: number | null
  countryId: string
  regionId: string
  subregion: string
  address: string
  latitude: number | null
  longitude: number | null
  email: string
  phone: string
  website: string
  logoUrl: string | null
  imageUrl: string | null
}

export type AdminWineryFormField = keyof AdminWineryFormValues

export type AdminWineryFormErrorCode =
  | 'nameRequired'
  | 'nameTooLong'
  | 'descriptionTooLong'
  | 'yearInteger'
  | 'yearRange'
  | 'countryRequired'
  | 'subregionTooLong'
  | 'addressTooLong'
  | 'latitudeRange'
  | 'longitudeRange'
  | 'coordinatesPair'
  | 'emailInvalid'
  | 'emailTooLong'
  | 'phoneTooLong'
  | 'phoneInvalid'
  | 'urlTooLong'
  | 'websiteInvalid'

export interface AdminWineryFormError {
  field: AdminWineryFormField
  code: AdminWineryFormErrorCode
}

/** Outcome of a winery save, so the editor can flag the fields the backend rejected. */
export type AdminWinerySaveResult = { saved: true } | { saved: false; rejectedFields: AdminWineryFormField[] }

export const ADMIN_WINERY_FORM_FIELDS: readonly AdminWineryFormField[] = [
  'name', 'descriptionEs', 'descriptionEn', 'establishedYear', 'countryId', 'regionId', 'subregion', 'address',
  'latitude', 'longitude', 'email', 'phone', 'website', 'logoUrl', 'imageUrl',
]

export function isAdminWineryFormField(field: string): field is AdminWineryFormField {
  return (ADMIN_WINERY_FORM_FIELDS as readonly string[]).includes(field)
}

export function toAdminWineryFormValues(winery: Partial<AdminWinery>): AdminWineryFormValues {
  return {
    name: winery.name ?? '',
    descriptionEs: winery.descriptionEs ?? '',
    descriptionEn: winery.descriptionEn ?? '',
    establishedYear: winery.establishedYear ?? null,
    countryId: winery.countryId ?? '',
    regionId: winery.regionId ?? '',
    subregion: winery.subregion ?? '',
    address: winery.address ?? '',
    latitude: winery.latitude ?? null,
    longitude: winery.longitude ?? null,
    email: winery.email ?? '',
    phone: winery.phone ?? '',
    website: winery.website ?? '',
    logoUrl: winery.logoUrl ?? null,
    imageUrl: winery.imageUrl ?? null,
  }
}

/** The winery fields the existing save payload builder reads. */
export function toAdminWineryDraft(values: AdminWineryFormValues): Partial<AdminWinery> {
  return {
    name: values.name.trim(),
    descriptionEs: values.descriptionEs || null,
    descriptionEn: values.descriptionEn || null,
    establishedYear: values.establishedYear,
    countryId: values.countryId || null,
    regionId: values.regionId || null,
    subregion: values.subregion || null,
    address: values.address || null,
    latitude: values.latitude,
    longitude: values.longitude,
    email: values.email.trim() || null,
    phone: values.phone || null,
    website: normalizeWinerySite(values.website),
    logoUrl: values.logoUrl || null,
    imageUrl: values.imageUrl || null,
  }
}

const SCHEME = /^[a-z][a-z\d+.-]*:\/\//i

/** The website as it is saved: trimmed, with https:// added when the scheme is missing. */
export function normalizeWinerySite(website: string): string | null {
  const trimmed = website.trim()
  if (!trimmed) return null
  return SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`
}

// http(s), a dotted host with no spaces, then an optional port and path.
const WEB_ADDRESS = /^https?:\/\/[^\s/?#:@]+\.[^\s/?#:@]+(:\d+)?([/?#]\S*)?$/i

function isWebAddress(website: string): boolean {
  return WEB_ADDRESS.test(website)
}

// Same shape the backend's @Email accepts in practice: one @, no spaces, a dotted domain.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateAdminWineryDraft(values: AdminWineryFormValues, currentYear = new Date().getFullYear()): AdminWineryFormError[] {
  const errors: AdminWineryFormError[] = []
  const push = (field: AdminWineryFormField, code: AdminWineryFormErrorCode) => errors.push({ field, code })
  const name = values.name.trim()
  if (!name) push('name', 'nameRequired')
  else if (name.length > MAX_WINERY_NAME_LENGTH) push('name', 'nameTooLong')
  if (values.descriptionEs.length > MAX_WINERY_DESCRIPTION_LENGTH) push('descriptionEs', 'descriptionTooLong')
  if (values.descriptionEn.length > MAX_WINERY_DESCRIPTION_LENGTH) push('descriptionEn', 'descriptionTooLong')
  const year = values.establishedYear
  if (year != null) {
    if (!Number.isInteger(year)) push('establishedYear', 'yearInteger')
    else if (year < MIN_WINERY_ESTABLISHED_YEAR || year > currentYear) push('establishedYear', 'yearRange')
  }
  if (!values.countryId) push('countryId', 'countryRequired')
  if (values.subregion.length > MAX_WINERY_SUBREGION_LENGTH) push('subregion', 'subregionTooLong')
  if (values.address.length > MAX_WINERY_ADDRESS_LENGTH) push('address', 'addressTooLong')
  const { latitude, longitude } = values
  if (latitude != null && (latitude < -90 || latitude > 90)) push('latitude', 'latitudeRange')
  if (longitude != null && (longitude < -180 || longitude > 180)) push('longitude', 'longitudeRange')
  if (latitude == null && longitude != null) push('latitude', 'coordinatesPair')
  if (longitude == null && latitude != null) push('longitude', 'coordinatesPair')
  const email = values.email.trim()
  if (email.length > MAX_WINERY_EMAIL_LENGTH) push('email', 'emailTooLong')
  else if (email && !EMAIL_PATTERN.test(email)) push('email', 'emailInvalid')
  if (values.phone.length > MAX_WINERY_PHONE_LENGTH) push('phone', 'phoneTooLong')
  else if (!PHONE_CHARACTERS.test(values.phone)) push('phone', 'phoneInvalid')
  const website = normalizeWinerySite(values.website)
  if (values.website.trim().length > MAX_WINERY_URL_LENGTH) push('website', 'urlTooLong')
  else if (website && !isWebAddress(website)) push('website', 'websiteInvalid')
  if ((values.logoUrl?.length ?? 0) > MAX_WINERY_URL_LENGTH) push('logoUrl', 'urlTooLong')
  if ((values.imageUrl?.length ?? 0) > MAX_WINERY_URL_LENGTH) push('imageUrl', 'urlTooLong')
  return errors
}
