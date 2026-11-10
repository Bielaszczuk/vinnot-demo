import { z } from 'zod'
import { MIN_WINERY_ESTABLISHED_YEAR, validateAdminWineryDraft, type AdminWineryFormField, type AdminWineryFormValues } from '@domain/admin/adminWineryForm'

export type AdminWineryFormSection = 'identity' | 'location' | 'contact' | 'images'

export const ADMIN_WINERY_FORM_SECTIONS: readonly AdminWineryFormSection[] = ['identity', 'location', 'contact', 'images']

const SECTION_BY_FIELD: Record<AdminWineryFormField, AdminWineryFormSection> = {
  name: 'identity', descriptionEs: 'identity', descriptionEn: 'identity', establishedYear: 'identity',
  countryId: 'location', regionId: 'location', subregion: 'location', address: 'location', latitude: 'location', longitude: 'location',
  email: 'contact', phone: 'contact', website: 'contact',
  logoUrl: 'images', imageUrl: 'images',
}

/** Section that holds a field, so an error opens and flags the right section. */
export function adminWineryFormSection(field: string): AdminWineryFormSection {
  return SECTION_BY_FIELD[field as AdminWineryFormField] ?? 'identity'
}

export function createAdminWineryFormSchema(translate: (key: string, options?: Record<string, unknown>) => string) {
  const yearBounds = { min: MIN_WINERY_ESTABLISHED_YEAR, max: new Date().getFullYear() }
  const number = () => z.number({ error: translate('admin.wineries.form.validation.number') }).nullable()
  return z.object({
    name: z.string(),
    descriptionEs: z.string(),
    descriptionEn: z.string(),
    establishedYear: number(),
    countryId: z.string(),
    regionId: z.string(),
    subregion: z.string(),
    address: z.string(),
    latitude: number(),
    longitude: number(),
    email: z.string(),
    phone: z.string(),
    website: z.string(),
    logoUrl: z.string().nullable(),
    imageUrl: z.string().nullable(),
  }).superRefine((values, context) => {
    for (const error of validateAdminWineryDraft(values as AdminWineryFormValues, yearBounds.max)) {
      context.addIssue({ code: 'custom', path: [error.field], message: translate(`admin.wineries.form.validation.${error.code}`, yearBounds) })
    }
  })
}
