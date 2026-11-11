import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import http from '@infrastructure/http/http'

vi.mock('@infrastructure/http/http', () => ({ default: { get: vi.fn() } }))
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

it('resolves relative admin user avatars and leaves absolute or missing ones untouched', async () => {
  const { adminClient } = await import('./admin.client')
  transport.get.mockResolvedValueOnce({ data: { items: [
    { id: 'u1', username: 'ana', avatarUrl: uploaded },
    { id: 'u2', username: 'sol', avatarUrl: google },
    { id: 'u3', username: 'leo' },
  ], totalItems: 3 } })

  const page = await adminClient.getUsers({ page: 0, size: 20 })

  expect(page.totalItems).toBe(3)
  expect(page.items.map((user) => user.avatarUrl)).toEqual([resolvedUpload, google, undefined])
  expect(page.items[2]).not.toHaveProperty('avatarUrl')
})

it('resolves relative admin reviewer avatars and keeps reviews without a reviewer', async () => {
  const { adminClient } = await import('./admin.client')
  const reviewer = (avatarUrl: string | null) => ({ id: 'u1', username: 'ana', displayName: 'Ana', avatarUrl })
  transport.get.mockResolvedValueOnce({ data: { items: [
    { id: 'r1', reviewer: reviewer(uploaded) },
    { id: 'r2', reviewer: reviewer(google) },
    { id: 'r3', reviewer: null },
  ], totalItems: 3 } })

  const page = await adminClient.getReviews({ page: 0, size: 20 })

  expect(page.items).toEqual([
    { id: 'r1', reviewer: reviewer(resolvedUpload) },
    { id: 'r2', reviewer: reviewer(google) },
    { id: 'r3', reviewer: null },
  ])
})
