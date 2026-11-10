import { describe, expect, it } from 'vitest'
import { toPreferredLanguage } from './accountLocale'

describe('toPreferredLanguage', () => {
  it('maps interface locales to the account language stored by the backend', () => {
    expect(toPreferredLanguage('en-US')).toBe('en')
    expect(toPreferredLanguage('EN')).toBe('en')
    expect(toPreferredLanguage('es-AR')).toBe('es')
  })

  it('falls back to Spanish for unknown or missing locales', () => {
    expect(toPreferredLanguage('pt-BR')).toBe('es')
    expect(toPreferredLanguage('')).toBe('es')
    expect(toPreferredLanguage(undefined)).toBe('es')
  })
})
