/**
 * Catalog images — wine photos staff upload through `/admin/catalog-images`.
 *
 * The photo travels as a data URL inside a JSON body that the backend caps at
 * 7,000,000 characters, so the file itself stays at 5 MB or less.
 */

export const CATALOG_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

export const MAX_CATALOG_IMAGE_BYTES = 5 * 1024 * 1024

/** Same `accept` list as the cover picker, for the file input. */
export const CATALOG_IMAGE_ACCEPT = CATALOG_IMAGE_TYPES.join(',')

export function acceptsCatalogImage(type: string, size: number): boolean {
  return (CATALOG_IMAGE_TYPES as readonly string[]).includes(type) && size > 0 && size <= MAX_CATALOG_IMAGE_BYTES
}
