import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import http from '@infrastructure/http/http'

vi.mock('@infrastructure/http/http', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
const transport = vi.mocked(http)

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.vinnot.com/api')
})
afterEach(() => vi.unstubAllEnvs())

const uploaded = '/api/uploads/avatars/ana.webp'
const resolvedUpload = 'https://api.vinnot.com/api/uploads/avatars/ana.webp'
const google = 'https://lh3.googleusercontent.com/a/photo=s256-c'

const reviewer = (avatarUrl: string | null) => ({ id: 'u1', username: 'ana', displayName: 'Ana', avatarUrl })
const review = (avatarUrl: string | null) => ({
  id: 'r1', wineId: 'w1', userId: 'u1', username: 'ana', userAvatarUrl: avatarUrl, rating: 4,
  createdAt: '2026-11-01T00:00:00Z', reviewer: reviewer(avatarUrl),
})

it('resolves a relative reviewer avatar in the review page and keeps absolute ones and paging untouched', async () => {
  const { winesReviewsClient } = await import('./wines.reviews.client')
  const items = [review(uploaded), review(google), { ...review(null), reviewer: null }]
  const page = { items, content: items, pageNumber: 0, pageSize: 10, totalItems: 3, totalPages: 1 }
  transport.get.mockResolvedValueOnce({ data: page })

  const result = await winesReviewsClient.getWineReviews('w1', { page: 0, pageSize: 10 })

  const expected = [review(resolvedUpload), review(google), { ...review(null), reviewer: null }]
  expect(result).toEqual({ ...page, items: expected, content: expected })
  expect(transport.get).toHaveBeenCalledWith('/wines/w1/reviews', { params: { page: 0, size: 10, filter: undefined } })
  expect(items[0]!.reviewer!.avatarUrl).toBe(uploaded)
})

it('resolves the reviewer avatar of a created or updated review', async () => {
  const { winesReviewsClient } = await import('./wines.reviews.client')
  transport.post.mockResolvedValueOnce({ data: review(uploaded) })
  expect(await winesReviewsClient.createWineReview('w1', { rating: 4 })).toEqual(review(resolvedUpload))
  transport.patch.mockResolvedValueOnce({ data: review(google) })
  expect(await winesReviewsClient.updateWineReview('w1', 'r1', { rating: 5 })).toEqual(review(google))
})

it('resolves comment author avatars when listing and adding comments', async () => {
  const { winesReviewsClient } = await import('./wines.reviews.client')
  const comment = (avatarUrl: string | null) => ({
    id: 'c1', reviewId: 'r1', content: 'Nice', createdAt: '2026-11-01', updatedAt: '2026-11-01', reviewer: reviewer(avatarUrl),
  })
  transport.get.mockResolvedValueOnce({ data: [comment(uploaded), comment(google), { ...comment(null), reviewer: null }] })
  expect(await winesReviewsClient.getReviewComments('w1', 'r1')).toEqual([
    comment(resolvedUpload), comment(google), { ...comment(null), reviewer: null },
  ])
  transport.post.mockResolvedValueOnce({ data: comment(uploaded) })
  expect(await winesReviewsClient.addReviewComment('w1', 'r1', 'Nice')).toEqual(comment(resolvedUpload))
})

it('keeps relative avatars relative when the web uses a same-origin proxy', async () => {
  vi.stubEnv('VITE_API_BASE_URL', '/api')
  const { winesReviewsClient } = await import('./wines.reviews.client')
  transport.post.mockResolvedValueOnce({ data: review(uploaded) })
  expect(await winesReviewsClient.createWineReview('w1', { rating: 4 })).toEqual(review(uploaded))
})
