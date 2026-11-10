import { afterEach, expect, it, vi } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import http from '@infrastructure/http/http'
import { adminSocialPostsClient } from './adminSocialPosts.client'

vi.mock('@infrastructure/http/resolveApiAssetUrl', () => ({
  resolveApiAssetUrl: (value: string | null | undefined) => (value ? `resolved:${value}` : null),
}))

const originalAdapter = http.defaults.adapter
afterEach(() => { http.defaults.adapter = originalAdapter })

// SocialPostAdminController answers with the bare body, no { data } envelope.
function capture(data: unknown) {
  const requests: InternalAxiosRequestConfig[] = []
  http.defaults.adapter = async (config): Promise<AxiosResponse> => {
    requests.push(config)
    return { config, status: 200, statusText: 'OK', headers: {}, data }
  }
  return requests
}

const copy = {
  language: 'en' as const, hook: 'Hook', slides: [{ title: 'A', body: 'B' }], caption: 'C', hashtags: ['#vinnot'], altText: 'Alt', cta: 'And you?',
}

it('lists the queue with only the filters that are set and unwraps the page', async () => {
  const requests = capture({ items: [{ id: 'p1' }], totalItems: 1 })

  await expect(adminSocialPostsClient.list({ page: 0, size: 20 })).resolves.toEqual({ items: [{ id: 'p1' }], totalItems: 1 })
  await adminSocialPostsClient.list({ page: 1, size: 10, status: 'PENDING_APPROVAL', from: '2026-11-01', to: '2026-11-30' })

  expect(requests.map((request) => [request.method, request.url])).toEqual([
    ['get', '/admin/social-posts'],
    ['get', '/admin/social-posts'],
  ])
  expect(requests[0]!.params).toEqual({ page: 0, size: 20 })
  expect(requests[1]!.params).toEqual({ page: 1, size: 10, status: 'PENDING_APPROVAL', from: '2026-11-01', to: '2026-11-30' })
})

it('reads one post, plans the window and runs the four review actions', async () => {
  const requests = capture({ id: 'p1' })

  await expect(adminSocialPostsClient.get('p 1')).resolves.toEqual({ id: 'p1' })
  await adminSocialPostsClient.plan()
  await adminSocialPostsClient.approve('p1')
  await adminSocialPostsClient.reject('p1', { reason: 'Tono' })
  await adminSocialPostsClient.update('p1', copy)
  await adminSocialPostsClient.regenerate('p1')

  expect(requests.map((request) => [request.method, request.url])).toEqual([
    ['get', '/admin/social-posts/p%201'],
    ['post', '/admin/social-posts/plan'],
    ['post', '/admin/social-posts/p1/approve'],
    ['post', '/admin/social-posts/p1/reject'],
    ['put', '/admin/social-posts/p1'],
    ['post', '/admin/social-posts/p1/regenerate'],
  ])
  expect(JSON.parse(requests[3]!.data as string)).toEqual({ reason: 'Tono' })
  expect(JSON.parse(requests[4]!.data as string)).toEqual(copy)
})

it('reads the wine days of a year and the pillars', async () => {
  const requests = capture([])

  await expect(adminSocialPostsClient.getWineDays(2026)).resolves.toEqual([])
  await expect(adminSocialPostsClient.getPillars()).resolves.toEqual([])

  expect(requests.map((request) => [request.method, request.url])).toEqual([
    ['get', '/admin/social-posts/wine-days'],
    ['get', '/admin/social-posts/pillars'],
  ])
  expect(requests[0]!.params).toEqual({ year: 2026 })
})

it('requests a new illustration for a post', async () => {
  const requests = capture({ id: 'p1' })

  await expect(adminSocialPostsClient.newIllustration('p 1')).resolves.toEqual({ id: 'p1' })

  expect(requests.map((request) => [request.method, request.url])).toEqual([['post', '/admin/social-posts/p%201/illustration']])
})

it('resolves the rendered image URLs of every post it returns against the API origin', async () => {
  const media = {
    status: 'READY', heroUrl: '/api/uploads/social/hero.png',
    slides: {
      es: { instagram: ['/api/uploads/social/es/ig-1.jpg'], tiktok: ['https://images.vinnot.com/es/tt-1.jpg'], renderedFor: 'h1' },
      en: { instagram: ['/api/uploads/social/en/ig-1.jpg'], tiktok: [], renderedFor: 'h2' },
    },
  }
  const resolved = {
    status: 'READY', heroUrl: 'resolved:/api/uploads/social/hero.png',
    slides: {
      es: { instagram: ['resolved:/api/uploads/social/es/ig-1.jpg'], tiktok: ['resolved:https://images.vinnot.com/es/tt-1.jpg'], renderedFor: 'h1' },
      en: { instagram: ['resolved:/api/uploads/social/en/ig-1.jpg'], tiktok: [], renderedFor: 'h2' },
    },
  }
  capture({ id: 'p1', media })

  for (const call of [
    () => adminSocialPostsClient.get('p1'),
    () => adminSocialPostsClient.approve('p1'),
    () => adminSocialPostsClient.reject('p1', {}),
    () => adminSocialPostsClient.update('p1', copy),
    () => adminSocialPostsClient.regenerate('p1'),
    () => adminSocialPostsClient.newIllustration('p1'),
  ]) {
    await expect(call()).resolves.toEqual({ id: 'p1', media: resolved })
  }

  const partial = { ...media, heroUrl: null, slides: { es: { ...media.slides.es, instagram: null }, en: null } }
  capture({ items: [{ id: 'p1', media: partial }, { id: 'p2', media: null }, { id: 'p3', media: { status: 'PENDING', slides: null } }], totalItems: 3 })
  await expect(adminSocialPostsClient.list({ page: 0, size: 20 })).resolves.toEqual({
    items: [
      { id: 'p1', media: { ...resolved, heroUrl: null, slides: { es: { ...resolved.slides.es, instagram: null }, en: null } } },
      { id: 'p2', media: null },
      { id: 'p3', media: { status: 'PENDING', heroUrl: null, slides: null } },
    ],
    totalItems: 3,
  })
})

it('retries the failed publication of one network and answers nothing', async () => {
  const requests = capture('')

  await expect(adminSocialPostsClient.retryPublication('p 1', 'THREADS')).resolves.toBeUndefined()

  expect(requests.map((request) => [request.method, request.url])).toEqual([['post', '/admin/social-posts/p%201/publications/THREADS/retry']])
})

it('switches the auto-approval and the planning of a pillar and returns the updated pillar', async () => {
  const pillar = { code: 'TERROIR', nameEs: 'Terruño', nameEn: 'Terroir', weight: 2, active: true, autoApprove: true, performance: null }
  const requests = capture(pillar)

  await expect(adminSocialPostsClient.setPillarAutoApprove('TER ROIR', true)).resolves.toEqual(pillar)
  await expect(adminSocialPostsClient.setPillarActive('TERROIR', false)).resolves.toEqual(pillar)

  expect(requests.map((request) => [request.method, request.url])).toEqual([
    ['put', '/admin/social-posts/pillars/TER%20ROIR/auto-approve'],
    ['put', '/admin/social-posts/pillars/TERROIR/active'],
  ])
  expect(JSON.parse(requests[0]!.data as string)).toEqual({ enabled: true })
  expect(JSON.parse(requests[1]!.data as string)).toEqual({ enabled: false })
})

it('moves a post to a new instant and publishes one now, resolving the image URLs of the post it returns (#513)', async () => {
  const requests = capture({ id: 'p1', media: { status: 'READY', heroUrl: '/api/uploads/social/hero.png', slides: null } })
  const resolved = { id: 'p1', media: { status: 'READY', heroUrl: 'resolved:/api/uploads/social/hero.png', slides: null } }

  await expect(adminSocialPostsClient.reschedule('p 1', { scheduledFor: '2026-11-10T12:30:00.000Z' })).resolves.toEqual(resolved)
  await expect(adminSocialPostsClient.publishNow('p 1')).resolves.toEqual(resolved)

  expect(requests.map((request) => [request.method, request.url])).toEqual([
    ['put', '/admin/social-posts/p%201/schedule'],
    ['post', '/admin/social-posts/p%201/publish-now'],
  ])
  expect(JSON.parse(requests[0]!.data as string)).toEqual({ scheduledFor: '2026-11-10T12:30:00.000Z' })
  expect(requests[1]!.data).toBeUndefined()
})
