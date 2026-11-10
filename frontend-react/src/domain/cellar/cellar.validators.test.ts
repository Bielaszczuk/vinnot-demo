import { describe, expect, it } from 'vitest'
import { addToCellarSchema, updateCellarEntrySchema } from './cellar.validators'

describe('cellar validators', () => {
  it('accepts valid optional metadata', () => {
    expect(addToCellarSchema.safeParse({
      wineId: 'wine-1', rating: 5, purchasePrice: 0, notes: null,
    }).success).toBe(true)
  })

  it('rejects missing identity and invalid rating, price and notes', () => {
    expect(addToCellarSchema.safeParse({ wineId: '' }).success).toBe(false)
    expect(updateCellarEntrySchema.safeParse({ rating: 0 }).success).toBe(false)
    expect(updateCellarEntrySchema.safeParse({ rating: 6 }).success).toBe(false)
    expect(updateCellarEntrySchema.safeParse({ purchasePrice: -1 }).success).toBe(false)
    expect(updateCellarEntrySchema.safeParse({ notes: 'x'.repeat(1001) }).success).toBe(false)
  })

  it('accepts a personal rating from 0.1 to 5.0 with one decimal at most', () => {
    expect(updateCellarEntrySchema.safeParse({ rating: 0.1 }).success).toBe(true)
    expect(addToCellarSchema.safeParse({ wineId: 'wine-1', rating: 3.6 }).success).toBe(true)
    expect(updateCellarEntrySchema.safeParse({ rating: 2.15 }).success).toBe(false)
    expect(updateCellarEntrySchema.safeParse({ rating: null }).success).toBe(true)
  })

  it('accepts an optional tasted vintage within the allowed years', () => {
    expect(addToCellarSchema.safeParse({ wineId: 'wine-1', vintage: 2018 }).success).toBe(true)
    expect(updateCellarEntrySchema.safeParse({ vintage: null }).success).toBe(true)
    expect(addToCellarSchema.safeParse({ wineId: 'wine-1', vintage: 1799 }).success).toBe(false)
    expect(updateCellarEntrySchema.safeParse({ vintage: 2101 }).success).toBe(false)
  })
})
