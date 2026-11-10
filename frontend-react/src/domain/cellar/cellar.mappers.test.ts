import { describe, expect, it } from 'vitest'
import {
  mapCellarApiWineToWine,
  mapCellarEntryFromDto,
  mapCellarEntryFromDtoWithFallback,
} from './cellar.mappers'

describe('cellar mappers', () => {
  it('normalizes flat cellar wine data and numeric ratings', () => {
    expect(mapCellarApiWineToWine({
      id: 'wine-1', name: 'Malbec', wineryName: 'Winery', ratingAverage: '4.25',
    })).toMatchObject({
      id: 'wine-1', name: 'Malbec', winery: 'Winery', type: 'RED', rating: 4.25,
      grapeVarieties: [], isNatural: false,
    })
  })

  it('maps nullable entry values and materializes its date', () => {
    const entry = mapCellarEntryFromDto({
      id: 'entry-1', wine: null, addedAt: '2026-08-11T12:00:00Z',
    })

    expect(entry.rating).toBeNull()
    expect(entry.purchasePrice).toBeNull()
    expect(entry.notes).toBeNull()
    expect(entry.addedAt).toEqual(new Date('2026-08-11T12:00:00Z'))
  })

  it('uses the selected wine while a create response omits nested wine data', () => {
    const fallback = { id: 'wine-1', name: 'Selected' } as never
    const entry = mapCellarEntryFromDtoWithFallback({
      id: 'entry-1', addedAt: '2026-08-11T12:00:00Z',
    }, fallback)

    expect(entry.wine).toBe(fallback)
  })
  it('keeps the one-decimal personal rating', () => {
    expect(mapCellarEntryFromDto({ id: 'entry', rating: 3.6, addedAt: '2026-10-27T00:00:00Z' }).rating).toBe(3.6)
    expect(mapCellarEntryFromDtoWithFallback({ id: 'entry', rating: 0.1, addedAt: '2026-10-27T00:00:00Z' },
      mapCellarApiWineToWine({})).rating).toBe(0.1)
  })

  it("preserves the existing review identity without exposing private notes as a review", () => {
    const dto = { id: "entry", addedAt: "2026-10-08T12:00:00Z", notes: "Private note", reviewId: "own-review" };
    expect(mapCellarEntryFromDto(dto).reviewId).toBe("own-review");
    expect(mapCellarEntryFromDto({ ...dto, reviewId: null }).reviewId).toBeNull();
    expect(mapCellarEntryFromDto({ id: "entry", addedAt: dto.addedAt }).reviewId).toBeNull();
  });
  it('maps the tasted vintage apart from the catalog wine vintage', () => {
    const dto = { id: 'entry', addedAt: '2026-10-08T12:00:00Z', vintage: 2018, wine: { id: 'wine-1', name: 'Malbec', vintage: 2020 } }
    const entry = mapCellarEntryFromDto(dto)
    expect(entry.vintage).toBe(2018)
    expect(entry.wine.vintage).toBe(2020)
    expect(mapCellarEntryFromDto({ ...dto, vintage: null }).vintage).toBeNull()
    expect(mapCellarEntryFromDto({ id: 'entry', addedAt: dto.addedAt }).vintage).toBeNull()
    expect(mapCellarEntryFromDtoWithFallback(dto, { id: 'wine-1' } as never).vintage).toBe(2018)
    expect(mapCellarEntryFromDtoWithFallback({ id: 'entry', addedAt: dto.addedAt }, { id: 'wine-1' } as never).vintage).toBeNull()
  })
})
