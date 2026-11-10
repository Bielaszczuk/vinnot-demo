/**
 * Admin domain validators (Zod schemas)
 *
 * Used in admin forms for CRUD operations on wines, wineries, events, routes and users.
 */

import { z } from 'zod'

// ── Wine ──────────────────────────────────────────────────────────────────

export const adminWineTypeSchema = z.enum(['RED', 'WHITE', 'ROSE', 'SPARKLING', 'DESSERT', 'FORTIFIED'])

export const adminWinePayloadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  wineType: adminWineTypeSchema,
  wineryId: z.string().min(1, 'Winery is required'),
  vintage: z.number().int().min(1800).max(new Date().getFullYear()).nullable().optional(),
  style: z.string().max(100).nullable().optional(),
  grapes: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  alcoholContent: z.number().min(0).max(100).nullable().optional(),
  descriptionEn: z.string().max(5000).nullable().optional(),
  descriptionEs: z.string().max(5000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  priceMin: z.number().min(0).nullable().optional(),
  priceMax: z.number().min(0).nullable().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  acidityScore: z.number().int().min(0).max(100).nullable().optional(),
  tanninScore: z.number().int().min(0).max(100).nullable().optional(),
  bodyScore: z.number().int().min(0).max(100).nullable().optional(),
  sweetnessScore: z.number().int().min(0).max(100).nullable().optional(),
})

export type AdminWinePayloadInput = z.infer<typeof adminWinePayloadSchema>

// ── Winery ────────────────────────────────────────────────────────────────

export const adminWineryPayloadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  countryId: z.string().min(1, 'Country is required'),
  regionId: z.string().nullable().optional(),
  subregion: z.string().max(100).nullable().optional(),
  descriptionEs: z.string().max(5000).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  website: z.string().url().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  establishedYear: z.number().int().min(1500).max(new Date().getFullYear()).nullable().optional(),
})

export type AdminWineryPayloadInput = z.infer<typeof adminWineryPayloadSchema>

// ── Event ─────────────────────────────────────────────────────────────────

export const adminEventTypeSchema = z.enum(['TASTING', 'FESTIVAL', 'TOUR', 'WORKSHOP', 'CLASS', 'DINNER', 'PAIRING', 'COMPETITION', 'FAIR', 'HARVEST', 'OTHER'])
export const adminEventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED', 'POSTPONED', 'SOLD_OUT'])

export const adminEventPayloadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).nullable().optional(),
  type: adminEventTypeSchema.optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  status: adminEventStatusSchema.optional(),
  locationName: z.string().max(200).nullable().optional(),
  locationAddress: z.string().max(300).nullable().optional(),
  locationCity: z.string().max(100).nullable().optional(),
  locationRegion: z.string().max(100).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  price: z.number().min(0).nullable().optional(),
  maxAttendees: z.number().int().min(1).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(30).nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
})

export type AdminEventPayloadInput = z.infer<typeof adminEventPayloadSchema>

// ── Route ─────────────────────────────────────────────────────────────────

export const adminRouteStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
export const adminRouteDifficultySchema = z.enum(['SHORT', 'MEDIUM', 'LONG'])

export const adminRouteStopSchema = z.object({
  name: z.string().min(1, 'Stop name is required'),
  description: z.string().min(1, 'Stop description is required'),
  type: z.string().min(1, 'Stop type is required'),
  address: z.string().min(1, 'Stop address is required'),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  stopOrder: z.number().int().min(0),
  estimatedDuration: z.number().int().min(0),
})

export const adminRoutePayloadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(5000).nullable().optional(),
  country: z.string().min(1, 'Country is required'),
  region: z.string().max(100).nullable().optional(),
  subregion: z.string().max(100).nullable().optional(),
  estimatedDuration: z.number().int().min(0).nullable().optional(),
  estimatedDays: z.number().int().min(1).nullable().optional(),
  totalDistance: z.number().min(0).nullable().optional(),
  difficulty: adminRouteDifficultySchema.nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  mapEmbedUrl: z.string().url().nullable().optional(),
  status: adminRouteStatusSchema.optional(),
  recommendedWineTypes: z.array(z.string()).nullable().optional(),
  stops: z.array(adminRouteStopSchema).nullable().optional(),
})

export type AdminRoutePayloadInput = z.infer<typeof adminRoutePayloadSchema>

// ── User ──────────────────────────────────────────────────────────────────

export const adminUserRoleSchema = z.enum(['ROLE_USER', 'ROLE_MODERATOR', 'ROLE_PARTNER', 'ROLE_ADMIN'])

export const adminBanUserSchema = z.object({
  reason: z.string().min(1, 'Ban reason is required').max(500),
})

export const adminAssignRoleSchema = z.object({
  role: adminUserRoleSchema,
})

export type AdminBanUserInput = z.infer<typeof adminBanUserSchema>
export type AdminAssignRoleInput = z.infer<typeof adminAssignRoleSchema>
