import { describe, expect, it } from 'vitest'
import { COUNTRY_NAMES, localizeCountryName } from './countryNames'

describe('localizeCountryName', () => {
  it('shows a known country in the interface language', () => {
    expect(localizeCountryName('Alemania', 'en-US')).toBe('Germany')
    expect(localizeCountryName('Alemania', 'es-AR')).toBe('Alemania')
    expect(localizeCountryName('Estados Unidos', 'en')).toBe('United States')
  })

  it('matches the stored name ignoring case, accents and surrounding spaces', () => {
    expect(localizeCountryName('españa', 'en-US')).toBe('Spain')
    expect(localizeCountryName('  ESPANA ', 'en-US')).toBe('Spain')
    expect(localizeCountryName('Japon', 'es-AR')).toBe('Japón')
    expect(localizeCountryName('Islas Vírgenes de EE. UU.', 'en-US')).toBe('U.S. Virgin Islands')
  })

  it('accepts the ISO code and the English name, including the MG row stored by code', () => {
    expect(localizeCountryName('MG', 'en-US')).toBe('Madagascar')
    expect(localizeCountryName('MG', 'es-AR')).toBe('Madagascar')
    expect(localizeCountryName('ar', 'en-US')).toBe('Argentina')
    expect(localizeCountryName('Germany', 'es-AR')).toBe('Alemania')
  })

  it('falls back to the stored name when the country is unknown', () => {
    expect(localizeCountryName('Atlántida', 'en-US')).toBe('Atlántida')
    expect(localizeCountryName('Atlántida', 'es-AR')).toBe('Atlántida')
  })

  it('returns an empty string for empty or missing input', () => {
    expect(localizeCountryName('', 'en-US')).toBe('')
    expect(localizeCountryName('   ', 'en-US')).toBe('')
    expect(localizeCountryName(null, 'en-US')).toBe('')
    expect(localizeCountryName(undefined, 'es-AR')).toBe('')
  })

  it('defaults to Spanish when the language is missing or not English', () => {
    expect(localizeCountryName('Germany', undefined)).toBe('Alemania')
    expect(localizeCountryName('Germany', 'pt-BR')).toBe('Alemania')
  })

  it('covers the 116 seeded countries with both names', () => {
    expect(Object.keys(COUNTRY_NAMES)).toHaveLength(116)
    for (const [code, names] of Object.entries(COUNTRY_NAMES)) {
      expect(code).toMatch(/^[a-z]{2}$/)
      expect(names.es.trim()).not.toBe('')
      expect(names.en.trim()).not.toBe('')
    }
  })
})
