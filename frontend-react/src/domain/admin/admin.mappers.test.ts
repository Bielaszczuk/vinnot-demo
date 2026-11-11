import { describe, expect, it } from 'vitest'
import { mapAdminReviewFromRaw, mapAdminWineryFromRaw, mapAdminStatsFromRaw, mapAdminUserFromRaw, mapAdminWineFromRaw } from './admin.mappers'

describe('admin mappers', () => {
  it('normalizes stats aliases and defaults optional aggregates', () => {
    expect(mapAdminStatsFromRaw({ totalUsers: 10, wines: 20 })).toEqual({
      users: 10, wines: 20, wineries: 0, events: 0, reviews: 0, routes: 0,
      activeUsers: null, publishedEvents: null, publishedRoutes: null,
    })
  })

  it('builds names and canonical role authorities', () => {
    const user = mapAdminUserFromRaw({
      id: 1, firstName: 'Ana', lastName: 'Pérez', roles: 'admin, user', active: true,
    })
    expect(user.name).toBe('Ana Pérez')
    expect(user).toMatchObject({ firstName: 'Ana', lastName: 'Pérez' })
    expect(mapAdminUserFromRaw({ id: 'u4' })).toMatchObject({ firstName: null, lastName: null })
    expect(user.roles).toEqual(['ROLE_ADMIN', 'ROLE_USER'])
    expect(user.enabled).toBe(true)
  })

  it('reads the user photo and keeps null when there is none', () => {
    expect(mapAdminUserFromRaw({ id: 'u1', avatarUrl: 'https://api.vinnot.com/api/uploads/avatars/a.webp' }).avatarUrl)
      .toBe('https://api.vinnot.com/api/uploads/avatars/a.webp')
    expect(mapAdminUserFromRaw({ id: 'u2', avatarUrl: '' }).avatarUrl).toBeNull()
    expect(mapAdminUserFromRaw({ id: 'u3' }).avatarUrl).toBeNull()
  })

  it('maps the user points and seal tier, hiding unknown tiers', () => {
    expect(mapAdminUserFromRaw({ id: 'u1', points: 1372, badgeTier: 'RESERVA' })).toMatchObject({ points: 1372, badgeTier: 'RESERVA' })
    // /admin/users sends the roles as one comma-separated `role`.
    expect(mapAdminUserFromRaw({ id: 'u3', role: 'ADMIN,USER' }).roles).toEqual(['ROLE_ADMIN', 'ROLE_USER'])
    expect(mapAdminUserFromRaw({ id: 'u2', points: 12, badgeTier: null })).toMatchObject({ points: 12, badgeTier: null })
    expect(mapAdminUserFromRaw({ id: 'u3' })).toMatchObject({ points: 0, badgeTier: null })
    expect(mapAdminUserFromRaw({ id: 'u4', badgeTier: 'SOMMELIER' }).badgeTier).toBeNull()
  })

  it('maps admin reviews with their decimal rating and reviewer seal tier', () => {
    const review = mapAdminReviewFromRaw({
      id: 'r1', wineId: 'w1', rating: 3.6, title: 'Fresh', comment: null, likesCount: 2, isVerified: true,
      createdAt: '2026-10-27T10:00:00Z',
      reviewer: { id: 'u1', username: 'ana', displayName: 'Ana', avatarUrl: null, badgeTier: 'BARRICA' },
      wine: { id: 'w1', name: 'Malbec', vintage: 2020, type: 'red' },
    })
    expect(review).toEqual({
      id: 'r1', wineId: 'w1', rating: 3.6, title: 'Fresh', comment: null, likesCount: 2, isVerified: true,
      createdAt: '2026-10-27T10:00:00Z',
      reviewer: { id: 'u1', username: 'ana', displayName: 'Ana', avatarUrl: null, badgeTier: 'BARRICA' },
      wine: { id: 'w1', name: 'Malbec', vintage: 2020 },
    })
    expect(mapAdminReviewFromRaw({ id: 'r2' })).toEqual({
      id: 'r2', wineId: '', rating: 0, title: null, comment: null, likesCount: 0, isVerified: false,
      createdAt: '', reviewer: null, wine: null,
    })
    expect(mapAdminReviewFromRaw({
      id: 'r3', wine: { id: 'w3', name: 'Torrontés' },
      reviewer: { id: 'u3', username: 'bob', displayName: 'Bob' },
    })).toMatchObject({
      wineId: 'w3',
      reviewer: { id: 'u3', username: 'bob', displayName: 'Bob', avatarUrl: null, badgeTier: null },
      wine: { id: 'w3', name: 'Torrontés', vintage: null },
    })
  })

  it('preserves already canonical roles supplied as an array', () => {
    expect(mapAdminUserFromRaw({ id: 'u1', name: 'Ana', roles: ['ROLE_USER'] }).roles)
      .toEqual(['ROLE_USER'])
  })

  it('normalizes legacy wine aliases and safe defaults', () => {
    const wine = mapAdminWineFromRaw({
      id: 'wine-1', name: 'Reserva', regionName: 'Mendoza', countryName: 'Argentina',
      featured: true, active: false,
    })
    expect(wine).toMatchObject({
      wineType: 'RED', region: 'Mendoza', country: 'Argentina',
      grapes: [], isFeatured: true, isActive: false,
    })
  })
})

it("preserves the active winery catalog count, including an actual zero", () => {
  expect(mapAdminWineryFromRaw({ id: "w1", name: "Winery", winesCount: 7 }).winesCount).toBe(7);
  expect(mapAdminWineryFromRaw({ id: "w2", name: "Empty", winesCount: 0 }).winesCount).toBe(0);
});

it("keeps the English description and the cover image so saving an edit never clears them", () => {
  const winery = mapAdminWineryFromRaw({ id: "w1", name: "Winery", descriptionEn: "Family winery", imageUrl: "https://cdn.example/cover.jpg" });
  expect(winery).toEqual(expect.objectContaining({ descriptionEn: "Family winery", imageUrl: "https://cdn.example/cover.jpg" }));
  expect(mapAdminWineryFromRaw({ id: "w2", name: "Bare" })).toEqual(expect.objectContaining({ descriptionEn: null, imageUrl: null }));
});
