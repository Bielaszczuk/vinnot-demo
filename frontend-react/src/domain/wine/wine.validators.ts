import { z } from 'zod'
import { isValidRating } from './wine.rating'

/**
 * A rating: 0.1 to 5.0 with one decimal at most (2.15 is entered as 2.2).
 */
export const ratingSchema = z.number().refine(isValidRating, { message: 'Rating must be 0.1–5.0 with one decimal' })

/**
 * Wine type enum schema
 */
export const wineTypeSchema = z.enum(['red', 'white', 'rose', 'sparkling', 'dessert', 'fortified', 'orange'])

/**
 * Tasting notes schema
 */
export const tastingNotesSchema = z.object({
  appearance: z.string(),
  aroma: z.array(z.string()),
  palate: z.array(z.string()),
  finish: z.string(),
  body: z.enum(['light', 'medium', 'full']),
  sweetness: z.enum(['dry', 'off-dry', 'medium-sweet', 'sweet']),
  tannins: z.enum(['low', 'medium', 'high']),
  acidity: z.enum(['low', 'medium', 'high']),
})

/**
 * Wine schema for validation
 */
export const wineSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Wine name is required').max(200),
  winery: z.string().min(1, 'Winery is required').max(200),
  type: wineTypeSchema,
  region: z.string().min(1, 'Region is required'),
  country: z.string().min(1, 'Country is required'),
  grapeVarieties: z.array(z.string()).default([]),
  vintage: z.number().int().min(1900).max(new Date().getFullYear()).nullable(),
  alcoholContent: z.number().min(0).max(100).nullable(),
  price: z.number().min(0).nullable(),
  rating: z.number().min(1).max(5).nullable(),
  reviewCount: z.number().int().min(0).default(0),
  description: z.string().default(''),
  imageUrl: z.string().url().nullable(),
  tastingNotes: tastingNotesSchema.nullable(),
  foodPairings: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Wine creation schema (partial)
 */
export const createWineSchema = wineSchema.omit({
  id: true,
  rating: true,
  reviewCount: true,
  createdAt: true,
  updatedAt: true,
})

/**
 * Wine update schema (partial)
 */
export const updateWineSchema = createWineSchema.partial()

/**
 * Wine review schema
 */
export const wineReviewSchema = z.object({
  id: z.string().uuid(),
  wineId: z.string().uuid(),
  userId: z.string().uuid(),
  userName: z.string(),
  rating: ratingSchema,
  comment: z.string().max(1000),
  createdAt: z.date(),
})

/**
 * Optional tasted vintage, shared by reviews and cellar notes
 */
export const tastedVintageSchema = z.number().int().min(1800).max(2100).nullable().optional()

/**
 * Create wine review schema
 */
export const createWineReviewSchema = z.object({
  rating: ratingSchema,
  comment: z.string().max(1000).optional(),
  vintage: tastedVintageSchema,
})

/**
 * Wine filter schema
 */
export const wineFilterSchema = z.object({
  search: z.string().optional(),
  type: z.union([wineTypeSchema, z.array(wineTypeSchema)]).optional(),
  region: z.union([z.string(), z.array(z.string())]).optional(),
  grapeVariety: z.union([z.string(), z.array(z.string())]).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  minRating: z.number().min(1).max(5).optional(),
  vintage: z.union([z.number(), z.array(z.number())]).optional(),
  sortBy: z.enum(['name', 'price', 'rating', 'vintage']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export type WineInput = z.infer<typeof createWineSchema>
export type WineUpdateInput = z.infer<typeof updateWineSchema>
export type WineReviewInput = z.infer<typeof createWineReviewSchema>
export type WineFilterInput = z.infer<typeof wineFilterSchema>

