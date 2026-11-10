/**
 * Cellar domain validators (Zod schemas)
 */

import { z } from 'zod'
import { ratingSchema, tastedVintageSchema } from '@domain/wine/wine.validators'

/**
 * Schema for adding a wine to the cellar
 */
export const addToCellarSchema = z.object({
  wineId: z.string().min(1, 'Wine ID is required'),
  rating: ratingSchema.nullable().optional(),
  purchasePrice: z.number().min(0).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  vintage: tastedVintageSchema,
})

/**
 * Schema for updating a cellar entry
 */
export const updateCellarEntrySchema = z.object({
  rating: ratingSchema.nullable().optional(),
  purchasePrice: z.number().min(0).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  vintage: tastedVintageSchema,
})

export type AddToCellarInput = z.infer<typeof addToCellarSchema>
export type UpdateCellarEntryInput = z.infer<typeof updateCellarEntrySchema>

