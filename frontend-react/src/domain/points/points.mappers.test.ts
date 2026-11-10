import { describe, expect, it } from 'vitest'
import { mapPointsSummaryFromDto } from './points.mappers'

describe('mapPointsSummaryFromDto', () => {
  it('maps the points summary with known tiers, sources and dates', () => {
    const summary = mapPointsSummaryFromDto({
      points: 1372,
      tier: 'RESERVA',
      nextTier: 'GRAN_RESERVA',
      nextTierAt: 1600,
      tierFloor: 1000,
      todayEarned: 6,
      dailyCap: 40,
      pendingCelebration: 'RESERVA',
      showWelcome: false,
      recent: [
        { id: 'e1', source: 'REVIEW', points: 3, createdAt: '2026-10-27T12:00:00Z', label: 'Malbec Reserva' },
        { id: 'e2', source: 'LIKE_RECEIVED', points: -1, createdAt: '2026-10-26T09:30:00Z', label: null },
      ],
    })
    expect(summary).toEqual({
      points: 1372,
      tier: 'RESERVA',
      nextTier: 'GRAN_RESERVA',
      nextTierAt: 1600,
      tierFloor: 1000,
      todayEarned: 6,
      dailyCap: 40,
      pendingCelebration: 'RESERVA',
      showWelcome: false,
      recent: [
        { id: 'e1', source: 'REVIEW', points: 3, createdAt: new Date('2026-10-27T12:00:00Z'), label: 'Malbec Reserva' },
        { id: 'e2', source: 'LIKE_RECEIVED', points: -1, createdAt: new Date('2026-10-26T09:30:00Z'), label: null },
      ],
    })
  })

  it('falls back safely on the top tier, unknown keys and missing fields', () => {
    const summary = mapPointsSummaryFromDto({
      points: 5200,
      tier: 'NOT_A_TIER',
      nextTier: null,
      nextTierAt: null,
      tierFloor: 5000,
      todayEarned: 0,
      dailyCap: 40,
      pendingCelebration: 'SOMMELIER',
      showWelcome: true,
      recent: [{ id: 'e3', source: 'SOMETHING_NEW', points: 2, createdAt: '2026-10-27T12:00:00Z' }],
    })
    expect(summary.tier).toBe('VINNOT')
    expect(summary.nextTier).toBeNull()
    expect(summary.nextTierAt).toBeNull()
    expect(summary.pendingCelebration).toBeNull()
    expect(summary.showWelcome).toBe(true)
    expect(summary.recent).toEqual([
      { id: 'e3', source: null, points: 2, createdAt: new Date('2026-10-27T12:00:00Z'), label: null },
    ])
  })

  it('treats an absent list and flags as empty', () => {
    const summary = mapPointsSummaryFromDto({ points: 0, tier: 'BROTE', tierFloor: 0, nextTier: 'PARRA', nextTierAt: 30, todayEarned: 0, dailyCap: 40 })
    expect(summary.recent).toEqual([])
    expect(summary.showWelcome).toBe(false)
    expect(summary.pendingCelebration).toBeNull()
  })
})
