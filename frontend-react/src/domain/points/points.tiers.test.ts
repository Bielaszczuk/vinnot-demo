import { describe, expect, it } from 'vitest'
import {
  BADGE_TIERS,
  parseBadgeTier,
  tierForPoints,
  tierIndex,
  tierProgress,
  tierSlug,
  tierThreshold,
} from './points.tiers'

describe('badge tiers', () => {
  it('lists the eleven tiers in ladder order with their thresholds', () => {
    expect(BADGE_TIERS.map((tier) => [tier, tierThreshold(tier)])).toEqual([
      ['BROTE', 0], ['PARRA', 30], ['RACIMO', 80], ['VENDIMIA', 160], ['LAGAR', 280],
      ['BARRICA', 450], ['CRIANZA', 700], ['RESERVA', 1000], ['GRAN_RESERVA', 1600],
      ['GRAN_ENOFILO', 2600], ['VINNOT', 5000],
    ])
    expect(tierIndex('BROTE')).toBe(0)
    expect(tierIndex('VINNOT')).toBe(10)
  })

  it('names the art file after the key in lower case with dashes', () => {
    expect(tierSlug('BROTE')).toBe('brote')
    expect(tierSlug('GRAN_RESERVA')).toBe('gran-reserva')
    expect(tierSlug('VINNOT')).toBe('vinnot')
  })

  it('accepts only the known keys and ignores anything else', () => {
    expect(parseBadgeTier('RESERVA')).toBe('RESERVA')
    expect(parseBadgeTier('reserva')).toBeNull()
    expect(parseBadgeTier('SOMMELIER')).toBeNull()
    expect(parseBadgeTier('PARRA')).toBe('PARRA')
    expect(parseBadgeTier('VINNOT')).toBe('VINNOT')
    expect(parseBadgeTier('PAMPANO')).toBeNull()
    expect(parseBadgeTier('ICONO_VINNOT')).toBeNull()
    expect(parseBadgeTier(null)).toBeNull()
    expect(parseBadgeTier(undefined)).toBeNull()
    expect(parseBadgeTier(7)).toBeNull()
  })

  it('finds the tier that current points reach', () => {
    expect(tierForPoints(0)).toBe('BROTE')
    expect(tierForPoints(29)).toBe('BROTE')
    expect(tierForPoints(30)).toBe('PARRA')
    expect(tierForPoints(1372)).toBe('RESERVA')
    expect(tierForPoints(5000)).toBe('VINNOT')
    expect(tierForPoints(-4)).toBe('BROTE')
  })
})

describe('tierProgress', () => {
  it('measures the way from the tier floor to the next tier', () => {
    expect(tierProgress({ points: 1372, tierFloor: 1000, nextTierAt: 1600 })).toEqual({ fraction: 0.62, remaining: 228 })
    expect(tierProgress({ points: 30, tierFloor: 30, nextTierAt: 80 })).toEqual({ fraction: 0, remaining: 50 })
  })

  it('is full with nothing left at the top tier', () => {
    expect(tierProgress({ points: 6100, tierFloor: 5000, nextTierAt: null })).toEqual({ fraction: 1, remaining: null })
  })

  it('stays between 0 and 1 when the points fall outside the band', () => {
    expect(tierProgress({ points: 10, tierFloor: 30, nextTierAt: 80 }).fraction).toBe(0)
    expect(tierProgress({ points: 90, tierFloor: 30, nextTierAt: 80 })).toEqual({ fraction: 1, remaining: 0 })
    expect(tierProgress({ points: 5, tierFloor: 5, nextTierAt: 5 })).toEqual({ fraction: 1, remaining: 0 })
  })
})
