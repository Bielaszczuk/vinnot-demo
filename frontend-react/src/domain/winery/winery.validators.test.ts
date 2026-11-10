import { describe, expect, it } from 'vitest'
import { wineryFilterSchema } from './winery.validators'

describe('winery validators', () => {
  it('accepts partial text filters and rejects non-string transport values', () => {
    expect(wineryFilterSchema.safeParse({ search: 'andes', country: 'Argentina' }).success)
      .toBe(true)
    expect(wineryFilterSchema.safeParse({ region: 123 }).success).toBe(false)
  })
})
