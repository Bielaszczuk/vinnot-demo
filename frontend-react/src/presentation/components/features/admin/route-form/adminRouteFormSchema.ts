import { z } from 'zod'
import type { AdminRouteStop } from '@domain/admin/admin.types'
import { validateAdminRouteDraft, type AdminRouteFormField, type AdminRouteFormValues } from '@domain/admin/adminRouteForm'

export type AdminRouteFormSection = 'details' | 'logistics' | 'stops' | 'cover'

export const ADMIN_ROUTE_FORM_SECTIONS: readonly AdminRouteFormSection[] = ['details', 'logistics', 'stops', 'cover']

const SECTION_BY_FIELD: Record<AdminRouteFormField, AdminRouteFormSection> = {
  name: 'details', description: 'details', country: 'details', region: 'details', subregion: 'details',
  status: 'details', difficulty: 'details',
  estimatedDays: 'logistics', totalDistance: 'logistics', estimatedDuration: 'logistics', durationFromStops: 'logistics',
  stops: 'stops',
  imageUrl: 'cover',
}

/** Section that holds a field, so an error opens and flags the right section. */
export function adminRouteFormSection(field: string): AdminRouteFormSection {
  return SECTION_BY_FIELD[field as AdminRouteFormField] ?? 'details'
}

/**
 * Route form schema. The stops live outside the form values (they keep their
 * identity for late geocoding results), so the rules that need them read the
 * current stops through `currentStops`.
 */
export function createAdminRouteFormSchema(
  translate: (key: string) => string,
  currentStops: () => readonly AdminRouteStop[],
) {
  const number = () => z.number({ error: translate('admin.routes.form.validation.number') }).nullable()
  return z.object({
    name: z.string(),
    description: z.string(),
    country: z.string(),
    region: z.string(),
    subregion: z.string(),
    status: z.string(),
    difficulty: z.string(),
    estimatedDays: number(),
    totalDistance: number(),
    estimatedDuration: number(),
    durationFromStops: z.boolean(),
    imageUrl: z.string().nullable(),
  }).superRefine((values, context) => {
    for (const error of validateAdminRouteDraft(values as AdminRouteFormValues, currentStops())) {
      context.addIssue({ code: 'custom', path: [error.field], message: translate(`admin.routes.form.validation.${error.code}`) })
    }
  })
}
