import { z } from 'zod'

/**
 * Event type enum schema
 */
export const eventTypeSchema = z.enum(['TASTING', 'FESTIVAL', 'TOUR', 'WORKSHOP', 'CLASS', 'DINNER', 'PAIRING', 'COMPETITION', 'FAIR', 'HARVEST', 'OTHER'])

/**
 * Event status enum schema
 */
export const eventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED', 'POSTPONED', 'SOLD_OUT'])

/**
 * Event location schema
 */
export const eventLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  region: z.string().min(1, 'Region is required'),
  country: z.string().min(1, 'Country is required'),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
})

/**
 * Event organizer schema
 */
export const eventOrganizerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable(),
})

/**
 * Event schema for validation
 */
export const eventSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  type: eventTypeSchema,
  startDate: z.date(),
  endDate: z.date(),
  location: eventLocationSchema,
  organizer: eventOrganizerSchema,
  imageUrl: z.string().url().nullable(),
  price: z.number().min(0).nullable(),
  maxAttendees: z.number().int().min(1).nullable(),
  currentAttendees: z.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),
  status: eventStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
})

/**
 * Create event schema
 */
export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  type: eventTypeSchema,
  startDate: z.date(),
  endDate: z.date(),
  location: eventLocationSchema,
  price: z.number().min(0).nullable().optional(),
  maxAttendees: z.number().int().min(1).nullable().optional(),
  tags: z.array(z.string()).optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
})

/**
 * Event filter schema
 */
export const eventFilterSchema = z.object({
  search: z.string().optional(),
  type: z.union([eventTypeSchema, z.array(eventTypeSchema)]).optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  status: eventStatusSchema.optional(),
  sortBy: z.enum(['date', 'price', 'popularity']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export type EventInput = z.infer<typeof createEventSchema>
export type EventFilterInput = z.infer<typeof eventFilterSchema>

