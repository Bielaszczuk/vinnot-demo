import type { TFunction } from 'i18next'

/** Localized wine type name; an unknown type falls back to the given name, then to the raw value. */
export function wineTypeLabel(t: TFunction, type: string | null | undefined, fallback?: string): string {
  const value = type?.trim()
  if (!value) return ''
  return t(`wines.types.${value.toLowerCase()}`, { defaultValue: fallback ?? value })
}
