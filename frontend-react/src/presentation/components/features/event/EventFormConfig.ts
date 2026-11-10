import { validateEventDraft } from "@domain/event/eventEditor"
import { z } from 'zod'
import type { EventStatus, EventType } from '@domain/event/event.types'

const optionalNumber = (value: unknown) => value === "" || value == null ? null : value

export const createEventFormSchema = (translate: (key: string) => string) => z.object({
  title: z.string().trim(),
  pricingMode: z.enum(['FREE', 'PAID']).optional(),
  description: z.string().nullable(),
  type: z.enum([
    'TASTING', 'FESTIVAL', 'TOUR', 'WORKSHOP', 'CLASS',
    'DINNER', 'PAIRING', 'COMPETITION', 'FAIR', 'HARVEST', 'OTHER',
  ] as const),
  status: z.enum([
    'DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED', 'POSTPONED', 'SOLD_OUT',
  ] as const),
  startDate: z.string(),
  endDate: z.string(),
  locationName: z.string().nullable(),
  locationAddress: z.string().nullable(),
  locationCity: z.string().nullable(),
  locationRegion: z.string().nullable(),
  locationCountry: z.string().nullable(),
  latitude: z.preprocess(optionalNumber, z.coerce.number({ error: translate("eventEditor.validation.coordinates") }).nullable()),
  longitude: z.preprocess(optionalNumber, z.coerce.number({ error: translate("eventEditor.validation.coordinates") }).nullable()),
  price: z.preprocess(optionalNumber, z.coerce.number({ error: translate("eventEditor.validation.price") }).nullable()),
  maxAttendees: z.preprocess(optionalNumber, z.coerce.number({ error: translate("eventEditor.validation.maxAttendees") }).nullable()),
  currency: z.string().trim(),
  registrationDeadline: z.string().nullable(),
  maxTicketsPerRegistration: z.coerce.number({ error: translate("eventEditor.validation.maxTicketsPerRegistration") }),
  approvalMode: z.enum(['MANUAL', 'AUTOMATIC']),
  attendeeConfirmationRequired: z.boolean(),
  registrationHoldMinutes: z.coerce.number({ error: translate("eventEditor.validation.registrationHoldMinutes") }),
  paymentAlias: z.string().nullable(),
  paymentQrUrl: z.string().nullable(),
  paymentInstructions: z.string().nullable(),
  imageUrl: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  websiteUrl: z.string().nullable(),
}).superRefine((data, context) => {
  for (const error of validateEventDraft(data)) {
    context.addIssue({ code: "custom", path: [error.field], message: translate(`eventEditor.validation.${error.code}`) })
  }

})

export const eventFormSchema = createEventFormSchema((key) => key)

export type EventFormData = z.infer<typeof eventFormSchema>

export const EVENT_FORM_DEFAULT_VALUES: EventFormData = {
  title: '',
  pricingMode: 'FREE',
  description: null,
  type: 'TASTING',
  status: 'DRAFT',
  startDate: '',
  endDate: '',
  locationName: null,
  locationAddress: null,
  locationCity: null,
  locationRegion: null,
  locationCountry: null,
  latitude: null,
  longitude: null,
  price: null,
  maxAttendees: null,
  currency: 'ARS',
  registrationDeadline: null,
  maxTicketsPerRegistration: 6,
  approvalMode: 'MANUAL',
  attendeeConfirmationRequired: true,
  registrationHoldMinutes: 1440,
  paymentAlias: null,
  paymentQrUrl: null,
  paymentInstructions: null,
  imageUrl: null,
  contactEmail: null,
  contactPhone: null,
  websiteUrl: null,
}

export function createEventFormDefaultValues(): EventFormData {
  const start = new Date()
  start.setSeconds(0, 0)
  start.setMinutes(0)
  start.setHours(start.getHours() + 1)

  const end = new Date(start)
  end.setHours(end.getHours() + 2)

  return {
    ...EVENT_FORM_DEFAULT_VALUES,
    startDate: toDatetimeLocal(start),
    endDate: toDatetimeLocal(end),
  }
}

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'TASTING', label: 'Degustación' },
  { value: 'FESTIVAL', label: 'Festival' },
  { value: 'TOUR', label: 'Tour' },
  { value: 'WORKSHOP', label: 'Taller' },
  { value: 'CLASS', label: 'Clase' },
  { value: 'DINNER', label: 'Cena' },
  { value: 'PAIRING', label: 'Maridaje' },
  { value: 'COMPETITION', label: 'Competencia' },
  { value: 'FAIR', label: 'Feria' },
  { value: 'HARVEST', label: 'Vendimia' },
  { value: 'OTHER', label: 'Otro' },
]

/** Cancelling is not a status choice: it only happens through the cancel dialog, with a reason. */
export const STATUS_OPTIONS: { value: EventStatus; label: string; disabled?: boolean }[] = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'PUBLISHED', label: 'Publicado' },
  { value: 'COMPLETED', label: 'Completado' },
]

/** An already cancelled event still shows its status, as a choice that cannot be picked. */
export function editorStatusOptions(current: EventStatus | undefined) {
  return current === 'CANCELLED'
    ? [...STATUS_OPTIONS, { value: 'CANCELLED' as EventStatus, label: 'Cancelado', disabled: true }]
    : STATUS_OPTIONS
}

export function toDatetimeLocal(date: Date | string | null | undefined): string {
  if (!date) return ''
  const converted = new Date(date)
  if (isNaN(converted.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${converted.getFullYear()}-${pad(converted.getMonth() + 1)}-${pad(converted.getDate())}T${pad(converted.getHours())}:${pad(converted.getMinutes())}`
}
