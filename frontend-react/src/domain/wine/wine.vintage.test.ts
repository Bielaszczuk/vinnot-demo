import { describe, expect, it } from 'vitest'
import {
  VINTAGE_OLDEST_YEAR,
  buildVintageChoices,
  resolveVintageUpdate,
  toVintageCreateFields,
  toVintagePatchFields,
} from './wine.vintage'

describe('buildVintageChoices', () => {
  it('lists every year from the current year down to 1900', () => {
    const choices = buildVintageChoices({ currentYear: 2026 })
    expect(VINTAGE_OLDEST_YEAR).toBe(1900)
    expect(choices).toHaveLength(2026 - 1900 + 1)
    expect(choices[0]).toEqual({ year: 2026, isCatalogVintage: false })
    expect(choices.at(-1)).toEqual({ year: 1900, isCatalogVintage: false })
  })

  it('suggests the catalog vintage first and does not repeat it in the list', () => {
    const choices = buildVintageChoices({ currentYear: 2026, catalogVintage: 2018 })
    expect(choices[0]).toEqual({ year: 2018, isCatalogVintage: true })
    expect(choices.filter((choice) => choice.year === 2018)).toHaveLength(1)
    expect(choices[1]).toEqual({ year: 2026, isCatalogVintage: false })
    expect(choices).toHaveLength(2026 - 1900 + 1)
  })

  it('ignores a catalog vintage that is not a plausible year', () => {
    expect(buildVintageChoices({ currentYear: 2026, catalogVintage: 0 })[0]?.year).toBe(2026)
    expect(buildVintageChoices({ currentYear: 2026, catalogVintage: 2030 })[0]?.year).toBe(2026)
    expect(buildVintageChoices({ currentYear: 2026, catalogVintage: null })[0]?.year).toBe(2026)
  })

  it('keeps a stored vintage outside the listed range selectable', () => {
    const choices = buildVintageChoices({ currentYear: 2026, selected: 1895 })
    expect(choices.at(-1)).toEqual({ year: 1895, isCatalogVintage: false })
    expect(buildVintageChoices({ currentYear: 2026, selected: 2027 })[0]).toEqual({ year: 2027, isCatalogVintage: false })
    expect(buildVintageChoices({ currentYear: 2026, selected: 2010 })).toHaveLength(2026 - 1900 + 1)
  })
})

describe('resolveVintageUpdate', () => {
  it('sends a selected vintage, a clear when one was removed, and nothing otherwise', () => {
    expect(resolveVintageUpdate(2018, null)).toBe(2018)
    expect(resolveVintageUpdate(2018, 2018)).toBe(2018)
    expect(resolveVintageUpdate(null, 2018)).toBeNull()
    expect(resolveVintageUpdate(null, null)).toBeUndefined()
  })
})

describe('vintage request fields', () => {
  it('adds the vintage to create requests only when one is chosen', () => {
    expect(toVintageCreateFields(2018)).toEqual({ vintage: 2018 })
    expect(toVintageCreateFields(null)).toEqual({})
    expect(toVintageCreateFields(undefined)).toEqual({})
  })

  it('maps an update intent to vintage, clearVintage, or no field at all', () => {
    expect(toVintagePatchFields(2018)).toEqual({ vintage: 2018 })
    expect(toVintagePatchFields(null)).toEqual({ clearVintage: true })
    expect(toVintagePatchFields(undefined)).toEqual({})
  })
})
