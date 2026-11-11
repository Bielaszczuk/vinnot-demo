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

  it('serializes editable user fields', () => {
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
  expect(mapUserProfileFromDto({ id: 'u', username: 'guest', createdAt: '2026-01-01', phoneNumber: '+5491123456789' } as never)).not.toHaveProperty('phoneNumber');
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

describe('public profile mapping', () => {
  it('maps every social field of GET /users/{id}/profile', () => {
    expect(mapUserProfileFromDto({
      id: 'u1', username: 'ana', fullName: 'Ana Pérez', avatarUrl: 'https://img/a.png', roles: ['ROLE_USER'],
      createdAt: '2026-01-01T00:00:00Z', bio: 'Malbec lover', tier: 'RESERVA',
      followersCount: 12, followingCount: 3, reviewsCount: 8, cellarCount: 20, cellarVisible: true,
      following: true, followsYou: false, affinityPercent: 76,
      tasteWheel: [{ kind: 'TYPE', value: 'RED', label: 'Tinto', score: 4 }],
      tasteTraits: { structure: [{ trait: 'BODY', score: 72, wines: 6 }], families: [{ family: 'FRUIT', percent: 80 }] },
    })).toEqual({
      id: 'u1', username: 'ana', displayName: 'Ana Pérez', avatar: 'https://img/a.png', joinedAt: new Date('2026-01-01T00:00:00Z'),
      bio: 'Malbec lover', tier: 'RESERVA', followersCount: 12, followingCount: 3, reviewsCount: 8,
      cellarCount: 20, cellarVisible: true, following: true, followsYou: false, affinityPercent: 76,
      tasteWheel: [{ kind: 'TYPE', value: 'RED', label: 'Tinto', score: 4, tone: null, ratedWines: 0 }],
      tasteTraits: { structure: [{ trait: 'BODY', score: 72, wines: 6, adjusted: false }], families: [{ family: 'FRUIT', percent: 80 }], fromQuiz: false },
    })
  })

  it('keeps hidden values hidden: no cellar count, no affinity, no wheel and no traits', () => {
    expect(mapUserProfileFromDto({ id: 'u2', username: 'leo', createdAt: '2026-02-01T00:00:00Z', cellarCount: null, cellarVisible: false })).toMatchObject({
      displayName: 'leo', avatar: null, bio: null, tier: null, followersCount: 0, followingCount: 0, reviewsCount: 0,
      cellarCount: null, cellarVisible: false, following: false, followsYou: false, affinityPercent: null, tasteWheel: null, tasteTraits: null,
    })
  })
})

describe('own social settings', () => {
  it('maps the bio and the cellar visibility of the signed-in user', () => {
    expect(mapUserFromDto({ id: 'u', email: 'u@example.com', bio: 'Hola', cellarVisibility: 'FOLLOWERS' })).toMatchObject({ bio: 'Hola', cellarVisibility: 'FOLLOWERS' })
    expect(mapUserFromDto({ id: 'u', email: 'u@example.com' })).toMatchObject({ bio: null, cellarVisibility: 'PUBLIC' })
  })
})
