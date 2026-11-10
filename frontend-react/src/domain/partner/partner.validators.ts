/**
 * Partner domain validators (Zod schemas)
 */

import { z } from 'zod'

export const partnerEventTypeSchema = z.enum(['TASTING', 'FESTIVAL', 'TOUR', 'WORKSHOP', 'CLASS', 'DINNER', 'PAIRING', 'COMPETITION', 'FAIR', 'HARVEST', 'OTHER'])
export const partnerEventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED', 'POSTPONED', 'SOLD_OUT'])

export const partnerEventPayloadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).nullable(),
  type: partnerEventTypeSchema,
  status: partnerEventStatusSchema,
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  locationName: z.string().max(200).nullable(),
  locationAddress: z.string().max(300).nullable(),
  locationCity: z.string().max(100).nullable(),
  locationRegion: z.string().max(100).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  price: z.number().min(0).nullable(),
  maxAttendees: z.number().int().min(1).nullable(),
  imageUrl: z.string().url().nullable(),
  contactEmail: z.string().email().nullable(),
  contactPhone: z.string().max(30).nullable(),
  websiteUrl: z.string().url().nullable(),
})

export type PartnerEventPayloadInput = z.infer<typeof partnerEventPayloadSchema>

