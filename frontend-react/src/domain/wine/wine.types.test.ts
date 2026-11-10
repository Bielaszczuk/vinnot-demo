import { describe, expect, it } from 'vitest'
import { toWineType } from './wine.types'

describe('toWineType', () => {
  it('reads the API codes and the filter values alike', () => {
    expect(toWineType('ROSE')).toBe('rose')
    expect(toWineType(' SPARKLING ')).toBe('sparkling')
    expect(toWineType('red')).toBe('red')
  })

  it('answers null for a missing or unknown type', () => {
    expect(toWineType(undefined)).toBeNull()
    expect(toWineType('')).toBeNull()
    expect(toWineType('BLUE')).toBeNull()
  })
})
