import { beforeEach, describe, expect, it, vi } from 'vitest'
import { socialClient } from '@api/clients/social.client'
import { socialService } from './social.service'

vi.mock('@api/clients/social.client', () => ({
  socialClient: {
    follow: vi.fn(), unfollow: vi.fn(), followers: vi.fn(), following: vi.fn(), suggestions: vi.fn(), feed: vi.fn(),
  },
}))

const row = { id: 'u1', username: 'ana', displayName: 'Ana', avatarUrl: null, tier: 'BROTE', following: true }
const review = {
  reviewId: 'r1', rating: 4, title: 'Fresco', comment: null, vintage: null, createdAt: '2026-11-01T00:00:00Z',
  reviewer: { id: 'u1', username: 'ana', displayName: 'Ana', avatarUrl: null, tier: null },
  wine: { id: 'w1', name: 'Malbec', imageUrl: null, type: 'RED', wineryName: 'Sur' },
}

describe('socialService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('follows and unfollows through the community endpoints', async () => {
    await socialService.follow('u1')
    await socialService.unfollow('u2')
    expect(socialClient.follow).toHaveBeenCalledWith('u1')
    expect(socialClient.unfollow).toHaveBeenCalledWith('u2')
  })

  it('maps followers and following pages into domain rows', async () => {
    vi.mocked(socialClient.followers).mockResolvedValue({ content: [row], page: 0, totalItems: 1, totalPages: 1 })
    vi.mocked(socialClient.following).mockResolvedValue({ content: [], page: 2, totalItems: 41, totalPages: 3 })
    await expect(socialService.followers('u9', 0)).resolves.toEqual({
      items: [{ id: 'u1', username: 'ana', displayName: 'Ana', avatarUrl: null, tier: 'BROTE', following: true }],
      page: 0, totalItems: 1, totalPages: 1,
    })
    await expect(socialService.following('u9', 2)).resolves.toEqual({ items: [], page: 2, totalItems: 41, totalPages: 3 })
    expect(socialClient.followers).toHaveBeenCalledWith('u9', 0, 20)
    expect(socialClient.following).toHaveBeenCalledWith('u9', 2, 20)
  })

  it('maps suggestions with their affinity', async () => {
    vi.mocked(socialClient.suggestions).mockResolvedValue([{ id: 'u3', username: 'sol', displayName: 'Sol', avatarUrl: null, tier: null, affinityPercent: 90, reviewsCount: 4 }])
    await expect(socialService.suggestions(6)).resolves.toEqual([
      { id: 'u3', username: 'sol', displayName: 'Sol', avatarUrl: null, tier: null, following: false, affinityPercent: 90, reviewsCount: 4 },
    ])
    expect(socialClient.suggestions).toHaveBeenCalledWith(6)
  })

  it('maps the following feed into domain reviews', async () => {
    vi.mocked(socialClient.feed).mockResolvedValue({ content: [review], page: 1, totalItems: 11, totalPages: 2 })
    const page = await socialService.feed(1, 10)
    expect(socialClient.feed).toHaveBeenCalledWith(1, 10)
    expect(page).toMatchObject({ page: 1, totalItems: 11, totalPages: 2 })
    expect(page.items[0]).toMatchObject({ id: 'r1', createdAt: new Date('2026-11-01T00:00:00Z'), wine: { name: 'Malbec' }, reviewer: { id: 'u1' } })
  })
})
