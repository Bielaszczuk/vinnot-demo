import { describe, expect, it } from 'vitest'
import { createWineReviewSchema, ratingSchema, wineFilterSchema, wineTypeSchema } from './wine.validators'

describe('wine validators', () => {
  it('accepts supported wine types and rejects transport values outside the domain', () => {
    expect(wineTypeSchema.safeParse('red').success).toBe(true)
    expect(wineTypeSchema.safeParse('orange').success).toBe(true)
    expect(wineTypeSchema.safeParse('amber').success).toBe(false)
  })

  it('enforces review and filter boundaries', () => {
    expect(createWineReviewSchema.safeParse({ rating: 5, comment: 'Great' }).success).toBe(true)
    expect(createWineReviewSchema.safeParse({ rating: 0 }).success).toBe(false)
    expect(wineFilterSchema.safeParse({ minPrice: -1 }).success).toBe(false)
    expect(wineFilterSchema.safeParse({ minRating: 6 }).success).toBe(false)
    expect(wineFilterSchema.safeParse({
      type: ['red', 'white'], sortBy: 'rating', sortOrder: 'desc',
    }).success).toBe(true)
  })

  it('accepts review ratings from 0.1 to 5.0 with one decimal at most', () => {
    expect(createWineReviewSchema.safeParse({ rating: 0.1 }).success).toBe(true)
    expect(createWineReviewSchema.safeParse({ rating: 3.6 }).success).toBe(true)
    expect(createWineReviewSchema.safeParse({ rating: 2.15 }).success).toBe(false)
    expect(createWineReviewSchema.safeParse({ rating: 5.1 }).success).toBe(false)
    expect(ratingSchema.safeParse(4.7).success).toBe(true)
  })

  it('accepts an optional tasted vintage within the allowed years', () => {
    expect(createWineReviewSchema.safeParse({ rating: 4, vintage: 2018 }).success).toBe(true)
    expect(createWineReviewSchema.safeParse({ rating: 4, vintage: null }).success).toBe(true)
    expect(createWineReviewSchema.safeParse({ rating: 4, vintage: 1799 }).success).toBe(false)
    expect(createWineReviewSchema.safeParse({ rating: 4, vintage: 2101 }).success).toBe(false)
    expect(createWineReviewSchema.safeParse({ rating: 4, vintage: 2018.5 }).success).toBe(false)
  })
})
