/**
 * Admin wine form — the values the wine editor holds and the rules they follow.
 *
 * Text fields hold strings (empty when missing) so inputs stay controlled; the
 * draft sent to the save payload turns empty optional text back into `null`.
 * Limits mirror `CreateWineAdminRequest` on the backend.
 */

import type { AdminWine } from './admin.types'

export const MAX_WINE_NAME_LENGTH = 255
export const MAX_WINE_STYLE_LENGTH = 100
export const MAX_WINE_IMAGE_URL_LENGTH = 500

export interface AdminWineTasteScores {
  bodyScore: number | null
  tanninScore: number | null
  sweetnessScore: number | null
  acidityScore: number | null
}

export interface AdminWineFormValues extends AdminWineTasteScores {
  name: string
  wineryId: string
  wineryName: string
  wineType: string
  vintage: number | null
  style: string
  alcoholContent: number | null
  grapes: string[]
  allergens: string[]
  isFeatured: boolean
  isActive: boolean
  descriptionEs: string
  descriptionEn: string
  imageUrl: string | null
  priceMin: number | null
  priceMax: number | null
}

export type AdminWineFormField = keyof AdminWineFormValues

export type AdminWineFormErrorCode =
  | 'nameRequired'
  | 'nameTooLong'
  | 'wineryRequired'
  | 'styleTooLong'
  | 'alcoholRange'
  | 'imageUrlTooLong'
  | 'priceNegative'
  | 'priceOrder'

export interface AdminWineFormError {
  field: AdminWineFormField
  code: AdminWineFormErrorCode
}

/** Allergen codes a wine label can declare, in display order. */
export const WINE_ALLERGENS = ['SULFITES', 'EGG', 'MILK', 'CASEIN', 'GELATIN', 'ISINGLASS', 'LYSOZYME', 'WHEAT_PROTEIN'] as const

export const ADMIN_WINE_TASTE_SCORES = ['bodyScore', 'tanninScore', 'sweetnessScore', 'acidityScore'] as const

export function toAdminWineFormValues(wine: Partial<AdminWine>): AdminWineFormValues {
  return {
    name: wine.name ?? '',
    wineryId: wine.wineryId ?? '',
    wineryName: wine.wineryName ?? '',
    wineType: wine.wineType || 'RED',
    vintage: wine.vintage ?? null,
    style: wine.style ?? '',
    alcoholContent: wine.alcoholContent ?? null,
    grapes: [...(wine.grapes ?? [])],
    allergens: [...(wine.allergens ?? [])],
    isFeatured: wine.isFeatured ?? false,
    isActive: wine.isActive !== false,
    descriptionEs: wine.descriptionEs ?? '',
    descriptionEn: wine.descriptionEn ?? '',
    imageUrl: wine.imageUrl ?? null,
    priceMin: wine.priceMin ?? null,
    priceMax: wine.priceMax ?? null,
    bodyScore: wine.bodyScore ?? null,
    tanninScore: wine.tanninScore ?? null,
    sweetnessScore: wine.sweetnessScore ?? null,
    acidityScore: wine.acidityScore ?? null,
  }
}

/** The wine fields and taste scores the existing save payload builder reads. */
export function toAdminWineDraft(values: AdminWineFormValues): { wine: Partial<AdminWine>; scores: AdminWineTasteScores } {
  return {
    wine: {
      name: values.name.trim(),
      wineryId: values.wineryId,
      wineryName: values.wineryName,
      wineType: values.wineType,
      vintage: values.vintage,
      style: values.style.trim() || null,
      alcoholContent: values.alcoholContent,
      grapes: [...values.grapes],
      allergens: [...values.allergens],
      isFeatured: values.isFeatured,
      isActive: values.isActive,
      descriptionEs: values.descriptionEs || null,
      descriptionEn: values.descriptionEn || null,
      imageUrl: values.imageUrl || null,
      priceMin: values.priceMin,
      priceMax: values.priceMax,
    },
    scores: {
      bodyScore: values.bodyScore,
      tanninScore: values.tanninScore,
      sweetnessScore: values.sweetnessScore,
      acidityScore: values.acidityScore,
    },
  }
}

export function validateAdminWineDraft(values: AdminWineFormValues): AdminWineFormError[] {
  const errors: AdminWineFormError[] = []
  const name = values.name.trim()
  if (!name) errors.push({ field: 'name', code: 'nameRequired' })
  else if (name.length > MAX_WINE_NAME_LENGTH) errors.push({ field: 'name', code: 'nameTooLong' })
  if (!values.wineryId) errors.push({ field: 'wineryId', code: 'wineryRequired' })
  if (values.style.trim().length > MAX_WINE_STYLE_LENGTH) errors.push({ field: 'style', code: 'styleTooLong' })
  if (values.alcoholContent != null && (values.alcoholContent < 0 || values.alcoholContent > 100)) {
    errors.push({ field: 'alcoholContent', code: 'alcoholRange' })
  }
  if ((values.imageUrl?.length ?? 0) > MAX_WINE_IMAGE_URL_LENGTH) errors.push({ field: 'imageUrl', code: 'imageUrlTooLong' })
  if (values.priceMin != null && values.priceMin < 0) errors.push({ field: 'priceMin', code: 'priceNegative' })
  if (values.priceMax != null && values.priceMax < 0) errors.push({ field: 'priceMax', code: 'priceNegative' })
  else if (values.priceMin != null && values.priceMax != null && values.priceMin >= 0 && values.priceMax < values.priceMin) {
    errors.push({ field: 'priceMax', code: 'priceOrder' })
  }
  return errors
}
