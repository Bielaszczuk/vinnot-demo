import { z } from 'zod'
import { validateAdminWineDraft, type AdminWineFormField, type AdminWineFormValues } from '@domain/admin/adminWineForm'

export type AdminWineFormSection = 'identity' | 'composition' | 'description' | 'prices' | 'taste'

export const ADMIN_WINE_FORM_SECTIONS: readonly AdminWineFormSection[] = ['identity', 'composition', 'description', 'prices', 'taste']

const SECTION_BY_FIELD: Record<AdminWineFormField, AdminWineFormSection> = {
  name: 'identity', wineryId: 'identity', wineryName: 'identity', wineType: 'identity', vintage: 'identity',
  isFeatured: 'identity', isActive: 'identity',
  grapes: 'composition', allergens: 'composition', style: 'composition', alcoholContent: 'composition',
  descriptionEs: 'description', descriptionEn: 'description', imageUrl: 'description',
  priceMin: 'prices', priceMax: 'prices',
  bodyScore: 'taste', tanninScore: 'taste', sweetnessScore: 'taste', acidityScore: 'taste',
}

/** Section that holds a field, so an error opens and flags the right section. */
export function adminWineFormSection(field: string): AdminWineFormSection {
  return SECTION_BY_FIELD[field as AdminWineFormField] ?? 'identity'
}

/** Number inputs report `''` when empty; the form keeps `null` instead. */
export function toOptionalNumber(value: unknown): number | null {
  if (value === '' || value == null) return null
  return typeof value === 'number' ? value : Number(value)
}

export function createAdminWineFormSchema(translate: (key: string) => string) {
  const number = () => z.number({ error: translate('admin.wines.form.validation.number') }).nullable()
  const score = () => z.number().min(0).max(100).nullable()
  return z.object({
    name: z.string(),
    wineryId: z.string(),
    wineryName: z.string(),
    wineType: z.string(),
    vintage: z.number().nullable(),
    style: z.string(),
    alcoholContent: number(),
    grapes: z.array(z.string()),
    allergens: z.array(z.string()),
    isFeatured: z.boolean(),
    isActive: z.boolean(),
    descriptionEs: z.string(),
    descriptionEn: z.string(),
    imageUrl: z.string().nullable(),
    priceMin: number(),
    priceMax: number(),
    bodyScore: score(),
    tanninScore: score(),
    sweetnessScore: score(),
    acidityScore: score(),
  }).superRefine((values, context) => {
    for (const error of validateAdminWineDraft(values as AdminWineFormValues)) {
      context.addIssue({ code: 'custom', path: [error.field], message: translate(`admin.wines.form.validation.${error.code}`) })
    }
  })
}
