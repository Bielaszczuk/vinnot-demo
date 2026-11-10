import { describe, expect, it } from 'vitest'
import {
  mapAiProfileFromDto,
  mapComparisonAttributeFromDto,
  mapTastingNotesFromDto,
  mapWineAwardFromDto,
  mapWineComparisonFromDto,
  mapWineFromDto,
  mapWineReviewCommentFromDto,
  mapWineReviewFromDto,
  mapWineScanResultFromDto,
  mapWineSummaryFromDto,
  mapWineToDto,
  setWineMapperLocale,
} from './wine.mappers'

describe('wine mappers', () => {
  it('maps detail and summary aliases with locale-aware descriptions', () => {
    setWineMapperLocale('en-US')
    const wine = mapWineFromDto({
      id: 'wine-1', name: 'Reserva', wineType: 'red', winery: {
        id: 'winery-1', name: 'Catena', regionName: 'Mendoza', countryName: 'Argentina',
      }, descriptionEs: 'Español', descriptionEn: 'English', ratingAverage: 4.5,
    })
    expect(wine).toMatchObject({
      winery: 'Catena', region: 'Mendoza', country: 'Argentina',
      description: 'English', rating: 4.5,
    })
    expect(mapWineSummaryFromDto({
      id: 'wine-1', name: 'Reserva', wineType: 'red', priceMin: 10,
    })).toMatchObject({ price: 10, grapeVarieties: [] })
    expect(mapWineToDto(wine)).toMatchObject({ name: 'Reserva', wineType: 'red' })
  })

  it('maps tasting details awards reviews and comments', () => {
    expect(mapTastingNotesFromDto({
      appearance: 'Ruby', finish: 'Long', body: 'full', sweetness: 'dry',
      tannins: 'high', acidity: 'high',
    })).toMatchObject({ aroma: [], palate: [] })
    expect(mapWineAwardFromDto({ name: 'Gold', year: 2025 })).toMatchObject({ medal: null })

    const review = mapWineReviewFromDto({
      id: 'review-1', wineId: 'wine-1', userId: 'legacy-user', username: 'legacy',
      rating: 5, createdAt: '2026-01-01T00:00:00Z', reviewer: {
        id: 'user-1', username: 'ana', displayName: 'Ana', totalReviews: 2,
      },
    })
    expect(review).toMatchObject({ userId: 'user-1', userName: 'Ana', likesCount: 0 })
    expect(mapWineReviewCommentFromDto({
      id: 'comment-1', reviewId: 'review-1', content: 'Great',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    }).reviewer).toBeNull()

    expect(mapWineReviewFromDto({
      id: 'review-2', wineId: 'wine-1', userId: 'user-2', username: 'legacy',
      rating: 4, createdAt: '2026-01-01T00:00:00Z',
    }).reviewer).toBeNull()
    expect(mapWineReviewCommentFromDto({
      id: 'comment-2', reviewId: 'review-2', content: 'Thanks',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      reviewer: { id: 'user-2', username: 'bob', displayName: 'Bob' },
    }).reviewer).toMatchObject({ id: 'user-2', avatarUrl: null })
  })

  it('keeps the decimal rating and the reviewer seal tier of reviews and comments', () => {
    const base = { id: 'review-4', wineId: 'wine-1', userId: 'user-4', username: 'ana', createdAt: '2026-01-01T00:00:00Z' }
    const review = mapWineReviewFromDto({
      ...base, rating: 3.6,
      reviewer: { id: 'user-4', username: 'ana', displayName: 'Ana', badgeTier: 'GRAN_RESERVA' },
    })
    expect(review.rating).toBe(3.6)
    expect(review.reviewer?.badgeTier).toBe('GRAN_RESERVA')
    expect(mapWineReviewFromDto({ ...base, rating: 2.2 }).rating).toBe(2.2)
    expect(mapWineReviewFromDto({
      ...base, rating: 4, reviewer: { id: 'user-4', username: 'ana', displayName: 'Ana', badgeTier: null },
    }).reviewer?.badgeTier).toBeNull()
    expect(mapWineReviewFromDto({
      ...base, rating: 4, reviewer: { id: 'user-4', username: 'ana', displayName: 'Ana', badgeTier: 'SOMMELIER' },
    }).reviewer?.badgeTier).toBeNull()
    expect(mapWineReviewFromDto({
      ...base, rating: 4, reviewer: { id: 'user-4', username: 'ana', displayName: 'Ana' },
    }).reviewer?.badgeTier).toBeNull()
    expect(mapWineReviewCommentFromDto({
      id: 'comment-4', reviewId: 'review-4', content: 'Agree',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      reviewer: { id: 'user-5', username: 'bob', displayName: 'Bob', badgeTier: 'RACIMO' },
    }).reviewer?.badgeTier).toBe('RACIMO')
  })

  it('maps the tasted review vintage and leaves it empty when the review has none', () => {
    const base = { id: 'review-3', wineId: 'wine-1', userId: 'user-3', username: 'ana', rating: 4, createdAt: '2026-01-01T00:00:00Z' }
    expect(mapWineReviewFromDto({ ...base, vintage: 2018 }).vintage).toBe(2018)
    expect(mapWineReviewFromDto({ ...base, vintage: null }).vintage).toBeNull()
    expect(mapWineReviewFromDto(base).vintage).toBeNull()
  })

  it('normalizes nested comparison content and dynamic best-for keys', () => {
    const result = mapWineComparisonFromDto({
      cached: true,
      comparisonContent: {
        summary: 'Comparison', differences: ['Body'],
        bestFor: { Reserva: ['Dinner'], Blanc: ['Lunch'] },
      },
    })
    expect(result).toMatchObject({
      aiSummary: 'Comparison', keyDifferences: ['Body'], fromCache: true,
      bestFor: { wineA: ['Dinner'], wineB: ['Lunch'] },
    })
    expect(mapComparisonAttributeFromDto({
      attribute: 'Body', values: ['Full', 'Light'], winner_index: 0,
    })).toEqual({ name: 'Body', values: ['Full', 'Light'], winnerIndex: 0 })

    expect(mapWineComparisonFromDto({
      cached: false, bestFor: { wineA: ['Dinner'], wineB: ['Lunch'] },
    }).bestFor).toEqual({ wineA: ['Dinner'], wineB: ['Lunch'] })
  })

  it('maps the AI profile art and drops unknown items', () => {
    const profile = mapAiProfileFromDto({
      wineId: 'wine-1', generatedAt: '2026-01-01T00:00:00Z', profileContent: {},
      profileArt: {
        aromas: [{ label: 'Limón', art: 'LEMON' }, { label: 'Nube', art: 'CLOUD' }],
        flavors: [], pairings: [],
        serving: { glass: 'WHITE_TULIP', decant: false, temperature: { min: 8, max: 10 } },
      },
    })
    expect(profile.profileArt).toEqual({
      aromas: [{ label: 'Limón', art: 'LEMON' }], flavors: [], pairings: [],
      serving: { glass: 'WHITE_TULIP', decant: false, temperature: { min: 8, max: 10 } },
    })
    expect(mapAiProfileFromDto({ wineId: 'wine-2', generatedAt: '2026-01-01T00:00:00Z' }).profileArt).toBeNull()
  })

  it('maps the AI color tones and drops unknown ones', () => {
    const profile = mapAiProfileFromDto({
      wineId: 'wine-1', generatedAt: '2026-01-01T00:00:00Z',
      visualColorTone: 'RED_GARNET', visualRimTone: 'RED_TAWNY', visualColorIntensity: 'DEEP', profileContent: {},
    })
    expect(profile.visualColorTone).toBe('RED_GARNET')
    expect(profile.visualColorIntensity).toBe('DEEP')
    expect(profile.visualRimTone).toBe('RED_TAWNY')
    expect(profile.visualHighlights).toBe(false)
    expect(mapAiProfileFromDto({
      wineId: 'wine-3', generatedAt: '2026-01-01T00:00:00Z', visualColorTone: 'RED_RUBY_DEEP',
      visualHighlights: true, profileContent: {},
    }).visualHighlights).toBe(true)
    expect(mapAiProfileFromDto({
      wineId: 'wine-4', generatedAt: '2026-01-01T00:00:00Z',
      visualReflectionTones: ['RED_PURPLE', 'BLUE', 'RED_TAWNY'], profileContent: {},
    }).visualReflectionTones).toEqual(['RED_PURPLE', 'RED_TAWNY'])

    const unknown = mapAiProfileFromDto({
      wineId: 'wine-2', generatedAt: '2026-01-01T00:00:00Z',
      visualColorTone: 'BLUE', visualRimTone: null, profileContent: {},
    })
    expect(unknown.visualColorTone).toBeNull()
    expect(unknown.visualRimTone).toBeNull()
    expect(unknown.visualColorIntensity).toBeNull()
    expect(mapAiProfileFromDto({
      wineId: 'wine-5', generatedAt: '2026-01-01T00:00:00Z', visualColorIntensity: 'VERY_DEEP', profileContent: {},
    }).visualColorIntensity).toBeNull()
  })

  it('maps AI food-pairing variants and scan suggestions', () => {
    const profile = mapAiProfileFromDto({
      wineId: 'wine-1', generatedAt: '2026-01-01T00:00:00Z',
      profileContent: { summary: 'Profile', foodPairings: ['Asado'] },
    })
    expect(profile.foodPairings).toEqual({ pairings: ['Asado'] })

    expect(mapAiProfileFromDto({
      wineId: 'wine-2', generatedAt: '2026-01-01T00:00:00Z',
      profileContent: { foodPairings: { pairings: ['Fish'], explanation: 'Fresh' } },
    }).foodPairings).toEqual({ pairings: ['Fish'], explanation: 'Fresh' })

    const scan = mapWineScanResultFromDto({
      confidence: 0.9, wine: null,
      suggestions: [{ id: 'wine-1', name: 'Reserva', wineType: 'red' }],
      extractedData: { wineName: 'Reserva', confidence: 0.8 },
    })
    expect(scan.suggestions).toHaveLength(1)
    expect(scan.extractedData).toMatchObject({ wineName: 'Reserva', confidence: 0.8 })
  })
})
