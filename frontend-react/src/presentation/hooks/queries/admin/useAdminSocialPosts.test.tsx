import { createElement, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminSocialPostsService } from '@services/adminSocialPosts.service'
import type { ContentPillarSettings, SocialPost, SocialPostMedia } from '@domain/admin/socialPost'
import {
  MEDIA_POLL_INTERVAL_MS,
  socialPostKeys,
  useAdminContentPillars,
  useAdminSocialPost,
  useAdminSocialPosts,
  useAdminWineDays,
  useApproveSocialPost,
  useNewSocialPostIllustration,
  usePlanSocialPosts,
  usePublishSocialPostNow,
  useRegenerateSocialPost,
  useRejectSocialPost,
  useRescheduleSocialPost,
  useRetrySocialPublication,
  useSetPillarActive,
  useSetPillarAutoApprove,
  useUpdateSocialPostCopy,
} from './useAdminSocialPosts'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const post = {
  id: 'p1', status: 'APPROVED', scheduledFor: '2026-11-03T22:00:00Z', pillar: null, wineDay: null,
  copies: { es: null, en: null }, generation: { provider: null, model: null, mock: false, attempts: 0, generatedAt: null, factCheck: null, issues: [], error: null },
  review: null, media: null, publishing: null, publications: [], canReschedule: true, canPublishNow: true, networkSchedule: [],
  createdAt: '2026-11-02T12:00:00Z', updatedAt: '2026-11-02T12:00:00Z',
} satisfies SocialPost

function setup() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client: cache }, children)
  return { cache, wrapper }
}

describe('admin social post queries', () => {
  it('reads the queue, one post, the wine days and the pillars through the service', async () => {
    const { cache, wrapper } = setup()
    vi.spyOn(adminSocialPostsService, 'getPosts').mockResolvedValue({ items: [post], totalItems: 1 })
    vi.spyOn(adminSocialPostsService, 'getPost').mockResolvedValue(post)
    vi.spyOn(adminSocialPostsService, 'getWineDays').mockResolvedValue([])
    vi.spyOn(adminSocialPostsService, 'getPillars').mockResolvedValue([])

    const { result, unmount } = renderHook(() => ({
      list: useAdminSocialPosts(0, 20, 'PENDING_APPROVAL'),
      detail: useAdminSocialPost('p1'),
      skipped: useAdminSocialPost(undefined),
      days: useAdminWineDays(2026),
      nextYear: useAdminWineDays(2027, false),
      pillars: useAdminContentPillars(),
    }), { wrapper })

    await waitFor(() => expect(result.current.list.data).toEqual({ items: [post], totalItems: 1 }))
    await waitFor(() => expect(result.current.detail.data).toEqual(post))
    await waitFor(() => expect(result.current.days.data).toEqual([]))
    await waitFor(() => expect(result.current.pillars.data).toEqual([]))
    expect(adminSocialPostsService.getPosts).toHaveBeenCalledWith(0, 20, 'PENDING_APPROVAL')
    expect(adminSocialPostsService.getWineDays).toHaveBeenCalledTimes(1)
    expect(result.current.skipped.fetchStatus).toBe('idle')
    expect(result.current.nextYear.fetchStatus).toBe('idle')
    unmount()
    cache.clear()
  })
})

describe('rendering media polling', () => {
  const ready: SocialPostMedia = {
    status: 'READY', source: 'AI', illustrationReason: null, heroUrl: null,
    slides: { es: { INSTAGRAM: ['ig-1.jpg'], TIKTOK: ['tt-1.jpg'], renderedFor: 'hash' }, en: null }, updatedAt: '2026-11-02T12:00:00Z',
  }

  it('refetches the selected post while its slides render and stops once they are ready', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { cache, wrapper } = setup()
    const pending = { ...post, media: { ...ready, status: 'PENDING' as const } }
    const done = { ...post, media: ready }
    const getPost = vi.spyOn(adminSocialPostsService, 'getPost').mockResolvedValueOnce(pending).mockResolvedValue(done)

    const { result, unmount } = renderHook(() => useAdminSocialPost('p1'), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(pending))
    expect(getPost).toHaveBeenCalledTimes(1)

    await act(async () => { await vi.advanceTimersByTimeAsync(MEDIA_POLL_INTERVAL_MS) })
    await waitFor(() => expect(result.current.data).toEqual(done))
    expect(getPost).toHaveBeenCalledTimes(2)

    await act(async () => { await vi.advanceTimersByTimeAsync(MEDIA_POLL_INTERVAL_MS * 3) })
    expect(getPost).toHaveBeenCalledTimes(2)
    unmount()
    cache.clear()
  })

  it('never polls a post without media or with failed media', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { cache, wrapper } = setup()
    const getPost = vi.spyOn(adminSocialPostsService, 'getPost')
      .mockResolvedValue({ ...post, media: { ...ready, status: 'FAILED', error: 'TEXT_DOES_NOT_FIT' } })

    const { result, unmount } = renderHook(() => useAdminSocialPost('p1'), { wrapper })
    await waitFor(() => expect(result.current.data?.media?.status).toBe('FAILED'))
    await act(async () => { await vi.advanceTimersByTimeAsync(MEDIA_POLL_INTERVAL_MS * 3) })
    expect(getPost).toHaveBeenCalledTimes(1)
    unmount()
    cache.clear()
  })
})

describe('admin social posts list refresh', () => {
  it('asks for the queue again on the given interval', async () => {
    const { cache, wrapper } = setup()
    vi.spyOn(adminSocialPostsService, 'getPosts').mockResolvedValue({ items: [post], totalItems: 1 })

    const { unmount } = renderHook(() => useAdminSocialPosts(0, 20, 'PENDING_APPROVAL', 20), { wrapper })

    await waitFor(() => expect(vi.mocked(adminSocialPostsService.getPosts).mock.calls.length).toBeGreaterThanOrEqual(2))
    unmount()
    cache.clear()
  })
})

describe('admin social post mutations', () => {
  type ReviewHook = () => { mutateAsync: (input: never) => Promise<SocialPost> }
  const cases: Array<[('approve' | 'reject' | 'regenerate' | 'newIllustration' | 'reschedule' | 'publishNow'), ReviewHook, unknown, unknown[]]> = [
    ['approve', useApproveSocialPost, 'p1', ['p1']],
    ['reject', useRejectSocialPost, { id: 'p1', reason: 'Tono' }, ['p1', 'Tono']],
    ['regenerate', useRegenerateSocialPost, 'p1', ['p1']],
    ['newIllustration', useNewSocialPostIllustration, 'p1', ['p1']],
    ['reschedule', useRescheduleSocialPost, { id: 'p1', date: '2026-11-10', time: '09:30' }, ['p1', { date: '2026-11-10', time: '09:30' }]],
    ['publishNow', usePublishSocialPostNow, 'p1', ['p1']],
  ]
  it.each(cases)('%s replaces the cached post and refreshes the queue', async (method, hook, variables, args) => {
    const { cache, wrapper } = setup()
    const listKey = socialPostKeys.list({ page: 0, size: 20, status: 'PENDING_APPROVAL' })
    cache.setQueryData(listKey, { items: [], totalItems: 0 })
    vi.spyOn(adminSocialPostsService, method).mockResolvedValue(post)

    const { result, unmount } = renderHook(hook, { wrapper })
    await act(async () => { await (result.current.mutateAsync as (input: unknown) => Promise<SocialPost>)(variables) })

    expect(adminSocialPostsService[method]).toHaveBeenCalledWith(...args)
    expect(cache.getQueryData(socialPostKeys.detail('p1'))).toEqual(post)
    expect(cache.getQueryState(listKey)?.isInvalidated).toBe(true)
    unmount()
    cache.clear()
  })

  it('sends an edited draft of its language and keeps the queue untouched when it fails', async () => {
    const { cache, wrapper } = setup()
    const listKey = socialPostKeys.list({ page: 0, size: 20 })
    cache.setQueryData(listKey, { items: [], totalItems: 0 })
    const draft = { hook: 'H', slides: [], caption: 'C', hashtags: '', altText: '', cta: '' }
    vi.spyOn(adminSocialPostsService, 'updateCopy').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(post)

    const { result, unmount } = renderHook(() => useUpdateSocialPostCopy(), { wrapper })
    await act(async () => { await expect(result.current.mutateAsync({ id: 'p1', language: 'en', draft })).rejects.toThrow('offline') })
    expect(cache.getQueryState(listKey)?.isInvalidated).toBe(false)

    await act(async () => { await result.current.mutateAsync({ id: 'p1', language: 'en', draft }) })
    expect(adminSocialPostsService.updateCopy).toHaveBeenCalledWith('p1', 'en', draft)
    expect(cache.getQueryState(listKey)?.isInvalidated).toBe(true)
    unmount()
    cache.clear()
  })

  it('plans the window and refreshes everything under the social posts', async () => {
    const { cache, wrapper } = setup()
    const detailKey = socialPostKeys.detail('p1')
    cache.setQueryData(detailKey, post)
    vi.spyOn(adminSocialPostsService, 'planNow').mockResolvedValue({ created: 4, from: '2026-11-02', to: '2026-11-15' })

    const { result, unmount } = renderHook(() => usePlanSocialPosts(), { wrapper })
    await act(async () => { await expect(result.current.mutateAsync()).resolves.toEqual({ created: 4, from: '2026-11-02', to: '2026-11-15' }) })

    expect(cache.getQueryState(detailKey)?.isInvalidated).toBe(true)
    unmount()
    cache.clear()
  })
})

describe('publication retry and pillar switches (#510)', () => {
  const pillar = (code: string, overrides: Partial<ContentPillarSettings> = {}): ContentPillarSettings => ({
    code, nameEs: code, nameEn: code, weight: 1, active: true, autoApprove: false,
    performance: { measuredPosts: 0, views: 0, interactions: 0, factor: 1 }, ...overrides,
  })

  it('retries a network and reads the post and the queue again', async () => {
    const { cache, wrapper } = setup()
    const detailKey = socialPostKeys.detail('p1')
    const listKey = socialPostKeys.list({ page: 0, size: 20 })
    cache.setQueryData(detailKey, post)
    cache.setQueryData(listKey, { items: [], totalItems: 0 })
    vi.spyOn(adminSocialPostsService, 'retryPublication').mockResolvedValue(undefined)

    const { result, unmount } = renderHook(() => useRetrySocialPublication(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ id: 'p1', network: 'FACEBOOK' }) })

    expect(adminSocialPostsService.retryPublication).toHaveBeenCalledWith('p1', 'FACEBOOK')
    expect(cache.getQueryState(detailKey)?.isInvalidated).toBe(true)
    expect(cache.getQueryState(listKey)?.isInvalidated).toBe(true)
    unmount()
    cache.clear()
  })

  it.each([
    ['setPillarAutoApprove', useSetPillarAutoApprove, pillar('TERROIR', { autoApprove: true })],
    ['setPillarActive', useSetPillarActive, pillar('TERROIR', { active: false })],
  ] as const)('%s replaces the switched pillar in the cached list', async (method, hook, updated) => {
    const { cache, wrapper } = setup()
    cache.setQueryData(socialPostKeys.pillars(), [pillar('QUIZ'), pillar('TERROIR')])
    vi.spyOn(adminSocialPostsService, method).mockResolvedValue(updated)

    const { result, unmount } = renderHook(hook, { wrapper })
    await act(async () => { await result.current.mutateAsync({ code: 'TERROIR', enabled: true }) })

    expect(adminSocialPostsService[method]).toHaveBeenCalledWith('TERROIR', true)
    expect(cache.getQueryData(socialPostKeys.pillars())).toEqual([pillar('QUIZ'), updated])
    unmount()
    cache.clear()
  })

  it('leaves the pillars uncached when none were read yet', async () => {
    const { cache, wrapper } = setup()
    vi.spyOn(adminSocialPostsService, 'setPillarActive').mockResolvedValue(pillar('QUIZ'))

    const { result, unmount } = renderHook(() => useSetPillarActive(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ code: 'QUIZ', enabled: true }) })

    expect(cache.getQueryData(socialPostKeys.pillars())).toBeUndefined()
    unmount()
    cache.clear()
  })
})
