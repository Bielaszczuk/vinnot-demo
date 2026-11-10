import { describe, expect, it } from 'vitest'
import {
  mapUserFromDto,
  mapUserProfileFromDto,
  mapUserPreferencesFromDto,
  mapUserStatsFromDto,
  mapUserToDto,
} from './user.mappers'

describe('user mappers', () => {
  it('normalizes aliases roles identity and default preferences', () => {
    const user = mapUserFromDto({
      id: 'user-1', email: 'wine@example.com', firstName: 'Ana', lastName: 'Pérez',
      roles: ['admin', 'UNKNOWN'], is_verified: true,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
    })
    expect(user.name).toBe('Ana Pérez')
    expect(user.roles).toEqual(['ROLE_ADMIN', 'ROLE_USER'])
    expect(user.isVerified).toBe(true)
    expect(user.preferences.locale).toBe('es-AR')
  })

  it('maps preference transport aliases', () => {
    const preferences = mapUserPreferencesFromDto({
      favorite_wine_types: ['RED'], favorite_regions: ['Mendoza'],
      price_range: { min: 10, max: 20 }, notifications: { push: true }, locale: 'en-US',
    })
    expect(preferences.notifications).toMatchObject({ email: true, push: true })
    expect(preferences).toMatchObject({
      favoriteWineTypes: ['RED'], favoriteRegions: ['Mendoza'], locale: 'en-US',
    })
  })

  it('maps mixed stats contracts without losing cellar totals', () => {
    expect(mapUserStatsFromDto({
      reviewsCount: 2, totalCellarWines: 4, eventsAttended: 1, averageRating: 4.5,
    })).toMatchObject({
      totalReviews: 2, totalWinesTasted: 4, cellarSize: 4,
      totalEventsAttended: 1, averageRating: 4.5,
    })
  })

  it('maps legacy profiles and serializes editable user fields', () => {
    expect(mapUserProfileFromDto({
      id: 7,
      name: 'Legacy',
      joined_at: '2026-01-01T00:00:00Z',
    })).toMatchObject({ id: '7', name: 'Legacy', favoriteWines: [], reviewCount: 0 })
    expect(mapUserToDto({
      username: 'ana', firstName: 'Ana', lastName: 'Pérez', avatar: null,
    })).toEqual({
      username: 'ana', firstName: 'Ana', lastName: 'Pérez', avatarUrl: undefined,
    })
  })
})

it('keeps phone on private session mappings and out of public profile projections', () => {
  expect(mapUserFromDto({ id: 'u', email: 'u@example.com', phoneNumber: '+5491123456789' }).phoneNumber).toBe('+5491123456789');
  expect(mapUserFromDto({ id: 'u', email: 'u@example.com' }).phoneNumber).toBeNull();
  expect(mapUserProfileFromDto({ id: 'u', name: 'Guest', joined_at: '2026-01-01', phoneNumber: '+5491123456789' } as never)).not.toHaveProperty('phoneNumber');
});

it('tells whether the account has a password, falling back to the social identity flag', () => {
  const base = { id: 'user-1', email: 'ana@vinnot.com' }
  expect(mapUserFromDto({ ...base, hasSocialIdentity: true, hasPassword: true }).hasPassword).toBe(true)
  expect(mapUserFromDto({ ...base, hasSocialIdentity: false, hasPassword: false }).hasPassword).toBe(false)
  // An older API without the field keeps the previous behavior.
  expect(mapUserFromDto({ ...base, hasSocialIdentity: true }).hasPassword).toBe(false)
  expect(mapUserFromDto({ ...base, hasSocialIdentity: false }).hasPassword).toBe(true)
  expect(mapUserFromDto(base).hasPassword).toBe(true)
})
