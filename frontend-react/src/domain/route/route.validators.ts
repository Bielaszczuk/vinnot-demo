import { z } from 'zod'

/**
 * Route duration category enum schema
 */
export const routeDifficultySchema = z.enum(['short', 'medium', 'long'])

/**
 * Stop type enum schema
 */
export const stopTypeSchema = z.enum(['winery', 'restaurant', 'viewpoint', 'attraction', 'accommodation'])

/**
 * Route location schema
 */
export const routeLocationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

/**
 * Route winery schema
 */
export const routeWinerySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  wines: z.array(z.string()).default([]),
})

/**
 * Route stop schema
 */
export const routeStopSchema = z.object({
  id: z.string().uuid(),
  order: z.number().int().min(0),
  name: z.string().min(1, 'Stop name is required'),
  type: stopTypeSchema,
  description: z.string(),
  location: routeLocationSchema,
  duration: z.number().int().min(1),
  winery: routeWinerySchema.nullable(),
})

/**
 * Wine route schema for validation
 */
export const wineRouteSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Route name is required').max(200),
  description: z.string().min(1, 'Description is required'),
  region: z.string().min(1, 'Region is required'),
  country: z.string().min(1, 'Country is required'),
  difficulty: routeDifficultySchema,
  duration: z.number().min(0.5, 'Duration must be at least 30 minutes'),
  distance: z.number().min(1, 'Distance must be at least 1 km'),
  stops: z.array(routeStopSchema).min(2, 'Route must have at least 2 stops'),
  imageUrl: z.string().url().nullable(),
  rating: z.number().min(1).max(5).nullable(),
  reviewCount: z.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Create wine route schema
 */
export const createWineRouteSchema = z.object({
  name: z.string().min(1, 'Route name is required').max(200),
  description: z.string().min(1, 'Description is required'),
  region: z.string().min(1, 'Region is required'),
  country: z.string().min(1, 'Country is required'),
  difficulty: routeDifficultySchema,
  duration: z.number().min(0.5, 'Duration must be at least 30 minutes'),
  distance: z.number().min(1, 'Distance must be at least 1 km'),
  tags: z.array(z.string()).optional(),
})

/**
 * Wine route filter schema
 */
export const wineRouteFilterSchema = z.object({
  search: z.string().optional(),
  region: z.union([z.string(), z.array(z.string())]).optional(),
  difficulty: z.union([routeDifficultySchema, z.array(routeDifficultySchema)]).optional(),
  minDuration: z.number().min(0).optional(),
  maxDuration: z.number().min(0).optional(),
  minDistance: z.number().min(0).optional(),
  maxDistance: z.number().min(0).optional(),
  minRating: z.number().min(1).max(5).optional(),
  sortBy: z.enum(['name', 'rating', 'duration', 'distance']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

/**
 * Wine route review schema
 */
export const createWineRouteReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  visitedAt: z.date(),
})


export type WineRouteInput = z.infer<typeof createWineRouteSchema>
export type WineRouteFilterInput = z.infer<typeof wineRouteFilterSchema>
export type WineRouteReviewInput = z.infer<typeof createWineRouteReviewSchema>

