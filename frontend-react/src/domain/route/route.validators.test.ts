import { describe, expect, it } from 'vitest'
import {
  createWineRouteReviewSchema,
  createWineRouteSchema,
  routeLocationSchema,
  wineRouteFilterSchema,
} from './route.validators'

describe('route validators', () => {
  it('enforces minimum duration and distance for a route', () => {
    const route = {
      name: 'Mendoza', description: 'Route', region: 'Mendoza', country: 'Argentina',
      difficulty: 'medium', duration: 1, distance: 10,
    }
    expect(createWineRouteSchema.safeParse(route).success).toBe(true)
    expect(createWineRouteSchema.safeParse({ ...route, duration: 0.25 }).success).toBe(false)
    expect(createWineRouteSchema.safeParse({ ...route, distance: 0 }).success).toBe(false)
  })

  it('validates route geography, filters and reviews', () => {
    expect(routeLocationSchema.safeParse({
      address: 'Street', city: 'City', latitude: -32.9, longitude: -68.8,
    }).success).toBe(true)
    expect(routeLocationSchema.safeParse({
      address: 'Street', city: 'City', latitude: -91, longitude: 0,
    }).success).toBe(false)
    expect(wineRouteFilterSchema.safeParse({ minRating: 6 }).success).toBe(false)
    expect(createWineRouteReviewSchema.safeParse({
      rating: 5, comment: 'Great', visitedAt: new Date(),
    }).success).toBe(true)
  })
})
