import { afterEach, describe, expect, it } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import http from '@infrastructure/http/http'
import { socialClient } from './social.client'
import { usersClient } from './users.client'

const originalAdapter = http.defaults.adapter
afterEach(() => {
  http.defaults.adapter = originalAdapter
})

function reply(data: unknown, status = 200) {
  const requests: InternalAxiosRequestConfig[] = []
  http.defaults.adapter = async (config): Promise<AxiosResponse> => {
    requests.push(config)
    return { config, status, statusText: 'OK', headers: {}, data }
  }
  return requests
}

const pageBody = (content: unknown[]) => ({
  items: content, content, pageNumber: 1, pageSize: 20, totalItems: 21, totalPages: 2,
  first: false, last: true, hasNext: false, hasPrevious: true, empty: false,
})

describe('socialClient', () => {
  it('follows with PUT and unfollows with DELETE on the community follows path', async () => {
    const requests = reply('', 204)
    await socialClient.follow('u/1')
    await socialClient.unfollow('u/1')
    expect(requests.map((request) => [request.method, request.url])).toEqual([
      ['put', '/community/follows/u%2F1'],
      ['delete', '/community/follows/u%2F1'],
    ])
  })

  it('reads followers and following pages with page and size', async () => {
    const requests = reply(pageBody([{ id: 'u2', username: 'ana', displayName: 'Ana', avatarUrl: null, tier: null, following: false }]))
    const followers = await socialClient.followers('u1', 1, 20)
    await socialClient.following('u1', 0, 20)
    expect(requests[0]!.url).toBe('/community/users/u1/followers')
    expect(requests[0]!.params).toEqual({ page: 1, size: 20 })
    expect(requests[1]!.url).toBe('/community/users/u1/following')
    expect(followers).toEqual({
      content: [{ id: 'u2', username: 'ana', displayName: 'Ana', avatarUrl: null, tier: null, following: false }],
      page: 1, totalItems: 21, totalPages: 2,
    })
  })

  it('reads suggestions as a plain or wrapped list', async () => {
    const row = { id: 'u3', username: 'sol', displayName: 'Sol', avatarUrl: null, tier: null, affinityPercent: 80, reviewsCount: 5 }
    const requests = reply([row])
    await expect(socialClient.suggestions(6)).resolves.toEqual([row])
    expect(requests[0]!.url).toBe('/community/suggestions')
    expect(requests[0]!.params).toEqual({ size: 6 })
    reply({ data: [row] })
    await expect(socialClient.suggestions(6)).resolves.toEqual([row])
    reply(null)
    await expect(socialClient.suggestions(6)).resolves.toEqual([])
  })

  it('reads the following feed page', async () => {
    const review = {
      reviewId: 'r1', rating: 4, title: null, comment: null, vintage: null, createdAt: '2026-11-01T00:00:00Z',
      reviewer: { id: 'u1', username: 'ana', displayName: null, avatarUrl: null, tier: null },
      wine: { id: 'w1', name: 'Malbec', imageUrl: null, type: 'RED', wineryName: null },
    }
    const requests = reply({ data: { content: [review], page: 0, totalElements: 1, totalPages: 1 } })
    await expect(socialClient.feed(0, 3)).resolves.toEqual({ content: [review], page: 0, totalItems: 1, totalPages: 1 })
    expect(requests[0]!.url).toBe('/community/feed')
    expect(requests[0]!.params).toEqual({ page: 0, size: 3 })
  })
})

describe('usersClient social endpoints', () => {
  it('reads the profile, reviews and cellar of a user', async () => {
    const requests = reply({ data: { id: 'u1', username: 'ana', avatarUrl: null } })
    await usersClient.getUserProfile('u1')
    reply(pageBody([]))
    const reviews = await usersClient.getUserReviews('u1', 0, 10)
    const cellarRequests = reply(pageBody([{ id: 'c1', wine: { id: 'w1', name: 'Malbec', imageUrl: null, type: null, wineryName: null }, vintage: null, rating: null, addedAt: '2026-10-01T00:00:00Z' }]))
    const cellar = await usersClient.getUserCellar('u1', 1, 12)
    expect(requests[0]!.url).toBe('/users/u1/profile')
    expect(reviews).toEqual({ content: [], page: 1, totalItems: 21, totalPages: 2 })
    expect(cellarRequests[0]!.url).toBe('/users/u1/cellar')
    expect(cellarRequests[0]!.params).toEqual({ page: 1, size: 12 })
    expect(cellar.content[0]!).toMatchObject({ id: 'c1', wine: { imageUrl: null } })
  })

  it('sends the bio and the cellar visibility with PATCH /users/me', async () => {
    const requests = reply({ data: { id: 'u1', email: 'a@b.c', name: 'Ana', bio: 'Hola', cellarVisibility: 'FOLLOWERS' } })
    await usersClient.updateUser({ bio: 'Hola', cellarVisibility: 'FOLLOWERS' })
    expect(requests[0]!.method).toBe('patch')
    expect(requests[0]!.url).toBe('/users/me')
    expect(JSON.parse(requests[0]!.data as string)).toEqual({ bio: 'Hola', cellarVisibility: 'FOLLOWERS' })
  })
})
