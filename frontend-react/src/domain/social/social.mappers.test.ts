import { describe, expect, it } from 'vitest'
import {
  mapPublicCellarWine,
  mapSocialPage,
  mapSocialReview,
  mapSocialUser,
  mapSuggestedUser,
  mapTasteTraits,
  mapTasteWheel,
  parseCellarVisibility,
} from './social.mappers'

const wine = { id: 'w1', name: 'Malbec Reserva', imageUrl: 'https://img/w1.webp', type: 'RED', wineryName: 'Bodega Sur' }

describe('social mappers', () => {
  it('maps a follow row with its seal, falling back to the username as display name', () => {
    expect(mapSocialUser({ id: 'u1', username: 'ana', displayName: 'Ana Pérez', avatarUrl: null, tier: 'RESERVA', following: true }))
      .toEqual({ id: 'u1', username: 'ana', displayName: 'Ana Pérez', avatarUrl: null, tier: 'RESERVA', following: true })
    expect(mapSocialUser({ id: 'u2', username: 'leo', displayName: '  ', tier: 'UNKNOWN' }))
      .toEqual({ id: 'u2', username: 'leo', displayName: 'leo', avatarUrl: null, tier: null, following: false })
  })

  it('maps a suggestion as not followed yet, with affinity and review count', () => {
    expect(mapSuggestedUser({ id: 'u3', username: 'sol', displayName: 'Sol', avatarUrl: 'a.png', tier: 'BROTE', affinityPercent: 82, reviewsCount: 9 }))
      .toEqual({ id: 'u3', username: 'sol', displayName: 'Sol', avatarUrl: 'a.png', tier: 'BROTE', following: false, affinityPercent: 82, reviewsCount: 9 })
    expect(mapSuggestedUser({ id: 'u4', username: 'max' })).toMatchObject({ affinityPercent: null, reviewsCount: 0 })
  })

  it('maps a review of the feed or a profile with its reviewer and wine', () => {
    expect(mapSocialReview({
      reviewId: 'r1', rating: 4.5, title: 'Fresco', comment: 'Fruta roja', vintage: 2019, createdAt: '2026-11-01T10:00:00Z',
      reviewer: { id: 'u1', username: 'ana', displayName: 'Ana', avatarUrl: null, tier: 'BARRICA' },
      wine,
    })).toEqual({
      id: 'r1', rating: 4.5, title: 'Fresco', comment: 'Fruta roja', vintage: 2019, createdAt: new Date('2026-11-01T10:00:00Z'),
      reviewer: { id: 'u1', username: 'ana', displayName: 'Ana', avatarUrl: null, tier: 'BARRICA' },
      wine: { id: 'w1', name: 'Malbec Reserva', imageUrl: 'https://img/w1.webp', type: 'RED', wineryName: 'Bodega Sur' },
    })
    expect(mapSocialReview({ reviewId: 'r2', rating: 3, createdAt: '2026-11-02T00:00:00Z', reviewer: { id: 'u2', username: 'leo' }, wine: { id: 'w2', name: 'Torrontés' } }))
      .toMatchObject({ title: null, comment: null, vintage: null, reviewer: { displayName: 'leo', tier: null }, wine: { imageUrl: null, type: null, wineryName: null } })
  })

  it('maps a public cellar wine without any private field', () => {
    const mapped = mapPublicCellarWine({ id: 'c1', wine, vintage: 2018, rating: 4, addedAt: '2026-10-01T00:00:00Z', notes: 'secret', purchasePrice: 9000 } as never)
    expect(mapped).toEqual({ id: 'c1', wine: { ...wine }, vintage: 2018, rating: 4, addedAt: new Date('2026-10-01T00:00:00Z') })
    expect(mapped).not.toHaveProperty('notes')
    expect(mapped).not.toHaveProperty('purchasePrice')
    expect(mapPublicCellarWine({ id: 'c2', wine, addedAt: '2026-10-01T00:00:00Z' })).toMatchObject({ vintage: null, rating: null })
  })

  it('maps the taste wheel, keeping known kinds and clamping scores to 0-5', () => {
    expect(mapTasteWheel(null)).toBeNull()
    expect(mapTasteWheel(undefined)).toBeNull()
    expect(mapTasteWheel([
      { kind: 'TYPE', value: 'RED', label: 'Tinto', score: 4.2, tone: 'RED', ratedWines: 9 },
      { kind: 'GRAPE', value: 'malbec', label: 'Malbec', score: 7, tone: 'RED', ratedWines: 6 },
      { kind: 'GRAPE', value: 'x', label: 'X', score: -1, tone: null, ratedWines: 1 },
      { kind: 'REGION', value: 'mendoza', label: 'Mendoza', score: 3, tone: null, ratedWines: 4 },
      { kind: 'COUNTRY', value: 'ar', label: 'Argentina', score: 3, tone: null, ratedWines: 4 },
    ])).toEqual([
      { kind: 'TYPE', value: 'RED', label: 'Tinto', score: 4.2, tone: 'RED', ratedWines: 9 },
      { kind: 'GRAPE', value: 'malbec', label: 'Malbec', score: 5, tone: 'RED', ratedWines: 6 },
      { kind: 'GRAPE', value: 'x', label: 'X', score: 0, tone: null, ratedWines: 1 },
      { kind: 'REGION', value: 'mendoza', label: 'Mendoza', score: 3, tone: null, ratedWines: 4 },
    ])
  })

  it('defaults the tone and rated wines of an older wheel payload that does not send them', () => {
    expect(mapTasteWheel([{ kind: 'GRAPE', value: 'malbec', label: 'Malbec', score: 4 }])).toEqual([
      { kind: 'GRAPE', value: 'malbec', label: 'Malbec', score: 4, tone: null, ratedWines: 0 },
    ])
    expect(mapTasteWheel([{ kind: 'GRAPE', value: 'malbec', label: 'Malbec', score: 4, tone: '', ratedWines: -2 }])).toEqual([
      { kind: 'GRAPE', value: 'malbec', label: 'Malbec', score: 4, tone: null, ratedWines: 0 },
    ])
  })

  it('maps the taste traits: structure in contract order, families by share, unknown values dropped', () => {
    expect(mapTasteTraits(null)).toBeNull()
    expect(mapTasteTraits(undefined)).toBeNull()
    expect(mapTasteTraits({
      structure: [
        { trait: 'SWEETNESS', score: 12, wines: 9 },
        { trait: 'ACIDITY', score: 140, wines: 12 },
        { trait: 'SALTINESS', score: 50, wines: 4 },
        { trait: 'BODY', score: -5, wines: 7 },
      ],
      families: [
        { family: 'OAK', percent: 40 },
        { family: 'FRUIT', percent: 120 },
        { family: 'EARTHY', percent: 60 },
        { family: 'MINERAL', percent: 0 },
        { family: 'FLORAL', percent: 15 },
      ],
    })).toEqual({
      structure: [
        { trait: 'ACIDITY', score: 100, wines: 12, adjusted: false },
        { trait: 'BODY', score: 0, wines: 7, adjusted: false },
        { trait: 'SWEETNESS', score: 12, wines: 9, adjusted: false },
      ],
      families: [
        { family: 'FRUIT', percent: 100 },
        { family: 'OAK', percent: 40 },
        { family: 'FLORAL', percent: 15 },
      ],
      fromQuiz: false,
    })
  })

  it('says when the taste traits come from the taste quiz', () => {
    expect(mapTasteTraits({ structure: [{ trait: 'BODY', score: 70, wines: 0 }], families: [], fromQuiz: true })).toEqual({
      structure: [{ trait: 'BODY', score: 70, wines: 0, adjusted: false }],
      families: [],
      fromQuiz: true,
    })
    expect(mapTasteTraits({ structure: [], families: [], fromQuiz: null } as never)?.fromQuiz).toBe(false)
  })

  it('says which structure traits the member set by hand', () => {
    expect(mapTasteTraits({
      structure: [
        { trait: 'ACIDITY', score: 80, wines: 0, adjusted: true },
        { trait: 'BODY', score: 55, wines: 6, adjusted: false },
        { trait: 'TANNIN', score: 40, wines: 6, adjusted: null },
      ],
      families: [],
    })?.structure).toEqual([
      { trait: 'ACIDITY', score: 80, wines: 0, adjusted: true },
      { trait: 'BODY', score: 55, wines: 6, adjusted: false },
      { trait: 'TANNIN', score: 40, wines: 6, adjusted: false },
    ])
  })

  it('keeps empty or missing taste trait lists empty', () => {
    expect(mapTasteTraits({ structure: [], families: [] })).toEqual({ structure: [], families: [], fromQuiz: false })
    expect(mapTasteTraits({} as never)).toEqual({ structure: [], families: [], fromQuiz: false })
  })

  it('maps a page of items', () => {
    expect(mapSocialPage({ content: [{ n: 1 }, { n: 2 }], page: 1, totalItems: 12, totalPages: 2 }, (item) => item.n * 10))
      .toEqual({ items: [10, 20], page: 1, totalItems: 12, totalPages: 2 })
  })

  it('reads the cellar visibility, defaulting to public', () => {
    expect(parseCellarVisibility('FOLLOWERS')).toBe('FOLLOWERS')
    expect(parseCellarVisibility('PRIVATE')).toBe('PRIVATE')
    expect(parseCellarVisibility('PUBLIC')).toBe('PUBLIC')
    expect(parseCellarVisibility(undefined)).toBe('PUBLIC')
    expect(parseCellarVisibility('friends')).toBe('PUBLIC')
  })
})
