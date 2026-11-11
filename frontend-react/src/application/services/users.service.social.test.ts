import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usersClient } from '@api/clients/users.client'
import { HttpError } from '@infrastructure/http/errors'
import { usersService } from './users.service'

vi.mock('@api/clients/users.client', () => ({
  usersClient: { getUserProfile: vi.fn(), getUserReviews: vi.fn(), getUserCellar: vi.fn(), updateUser: vi.fn() },
}))

const wine = { id: 'w1', name: 'Malbec', imageUrl: null, type: 'RED', wineryName: 'Sur' }

describe('usersService social profile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps the public profile with the social fields', async () => {
    vi.mocked(usersClient.getUserProfile).mockResolvedValue({
      id: 'u1', username: 'ana', fullName: 'Ana Pérez', avatarUrl: null, roles: ['ROLE_USER'], createdAt: '2026-01-01T00:00:00Z',
      bio: 'Hola', tier: 'RESERVA', followersCount: 4, followingCount: 2, reviewsCount: 7, cellarCount: null, cellarVisible: false,
      following: false, followsYou: true, affinityPercent: null, tasteWheel: null, tasteTraits: null,
    })
    await expect(usersService.getUserProfile('u1')).resolves.toMatchObject({
      id: 'u1', displayName: 'Ana Pérez', bio: 'Hola', tier: 'RESERVA', followersCount: 4, cellarCount: null,
      cellarVisible: false, followsYou: true, tasteWheel: null, tasteTraits: null,
    })
  })

  it('maps the approved reviews of a profile', async () => {
    vi.mocked(usersClient.getUserReviews).mockResolvedValue({
      content: [{ reviewId: 'r1', rating: 5, title: null, comment: 'Gran vino', vintage: 2020, createdAt: '2026-11-03T00:00:00Z',
        reviewer: { id: 'u1', username: 'ana', displayName: 'Ana', avatarUrl: null, tier: null }, wine }],
      page: 0, totalItems: 1, totalPages: 1,
    })
    const page = await usersService.getUserReviews('u1', 0)
    expect(usersClient.getUserReviews).toHaveBeenCalledWith('u1', 0, 10)
    expect(page.items[0]).toMatchObject({ id: 'r1', comment: 'Gran vino', vintage: 2020, wine: { name: 'Malbec' } })
  })

  it('maps a visible cellar page', async () => {
    vi.mocked(usersClient.getUserCellar).mockResolvedValue({
      content: [{ id: 'c1', wine, vintage: 2019, rating: 4, addedAt: '2026-10-01T00:00:00Z' }], page: 0, totalItems: 1, totalPages: 1,
    })
    await expect(usersService.getUserCellar('u1', 0)).resolves.toEqual({
      visible: true,
      page: { items: [{ id: 'c1', wine, vintage: 2019, rating: 4, addedAt: new Date('2026-10-01T00:00:00Z') }], page: 0, totalItems: 1, totalPages: 1 },
    })
    expect(usersClient.getUserCellar).toHaveBeenCalledWith('u1', 0, 12)
  })

  it('turns 403 CELLAR_NOT_VISIBLE into the locked cellar', async () => {
    vi.mocked(usersClient.getUserCellar).mockRejectedValue(new HttpError(403, 'CELLAR_NOT_VISIBLE', 'Hidden'))
    await expect(usersService.getUserCellar('u1', 0)).resolves.toEqual({ visible: false })
  })

  it('keeps other cellar failures as errors', async () => {
    const forbidden = new HttpError(403, 'FORBIDDEN', 'No')
    vi.mocked(usersClient.getUserCellar).mockRejectedValueOnce(forbidden)
    await expect(usersService.getUserCellar('u1', 0)).rejects.toBe(forbidden)
    const offline = new Error('offline')
    vi.mocked(usersClient.getUserCellar).mockRejectedValueOnce(offline)
    await expect(usersService.getUserCellar('u1', 0)).rejects.toBe(offline)
  })

  it('saves the trimmed bio and the cellar visibility with PATCH /users/me', async () => {
    vi.mocked(usersClient.updateUser).mockResolvedValue({ id: 'u1', email: 'ana@vinnot.com', name: 'Ana', bio: 'Malbec', cellarVisibility: 'PRIVATE' })
    const user = await usersService.updateSocialProfile({ bio: '  Malbec  ', cellarVisibility: 'PRIVATE' })
    expect(usersClient.updateUser).toHaveBeenCalledWith({ bio: 'Malbec', cellarVisibility: 'PRIVATE' })
    expect(user).toMatchObject({ id: 'u1', bio: 'Malbec', cellarVisibility: 'PRIVATE' })
  })
})
