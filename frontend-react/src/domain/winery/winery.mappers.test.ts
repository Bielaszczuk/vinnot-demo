import { describe, expect, it } from 'vitest'
import { localizedWineryDescription, mapWineryFromDto, mapWinerySummaryFromDto } from './winery.mappers'

describe('winery mappers', () => {
  it('maps stable detail defaults', () => {
    expect(mapWineryFromDto({ id: 'winery-1', name: 'Winery' })).toMatchObject({
      ratingsCount: 0, ratingsAverage: null, winesCount: 0, labelsCount: 0,
      isActive: true, countryId: null, regionId: null,
    })
  })

  it('preserves summary location and assets', () => {
    expect(mapWinerySummaryFromDto({
      id: 'winery-1', name: 'Winery', latitude: -32.9, longitude: -68.8,
      logoUrl: 'logo.jpg',
    })).toMatchObject({
      latitude: -32.9, longitude: -68.8, logoUrl: 'logo.jpg', address: null,
    })
  })
})

describe('localized winery description', () => {
  const winery = { descriptionEs: 'Bodega familiar', descriptionEn: 'Family winery' }
  it('uses the active language first', () => {
    expect(localizedWineryDescription(winery, 'es-AR')).toBe('Bodega familiar')
    expect(localizedWineryDescription(winery, 'en-US')).toBe('Family winery')
  })
  it('falls back to the other language, then to none', () => {
    expect(localizedWineryDescription({ descriptionEs: null, descriptionEn: 'Family winery' }, 'es-AR')).toBe('Family winery')
    expect(localizedWineryDescription({ descriptionEs: 'Bodega familiar', descriptionEn: '  ' }, 'en-US')).toBe('Bodega familiar')
    expect(localizedWineryDescription({ descriptionEs: null, descriptionEn: null }, 'es-AR')).toBeNull()
    expect(localizedWineryDescription(undefined, 'es-AR')).toBeNull()
  })
})
