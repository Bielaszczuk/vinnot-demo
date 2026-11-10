import { createElement, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { winesService } from '@services/wines.service'
import { queryKeys } from '../queryKeys'
import { useCreateReview } from './useCreateReview'

afterEach(() => vi.restoreAllMocks())
it('refreshes public ratings and pending moderation after success, preserving caches after failure', async () => {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const affected = [queryKeys.wines.detail('wine'), queryKeys.wines.reviews('wine'),
    queryKeys.wines.list({ countryId: 'ar' }), ['community', 'operator', 'publications'],
    ['community', 'operator', 'moderationOverview'], queryKeys.cellar.list({}),
    queryKeys.users.myStats(), queryKeys.admin.reviews.list({}), queryKeys.admin.stats(), queryKeys.users.myPoints()]
  const preserved = [queryKeys.wines.detail('other'), queryKeys.wines.comparison('a', 'b', 'es')]
  for (const key of [...affected, ...preserved]) cache.setQueryData(key, 'cached')
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: cache }, children)
  const { result, unmount } = renderHook(() => useCreateReview(), { wrapper })
  vi.spyOn(winesService, 'addReview').mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ id: 'review', wineId: 'wine', userId: 'author', userName: 'Author', userAvatar: null,
    rating: 4, vintage: null, title: null, comment: null, likesCount: 0, commentsCount: 0, likedByCurrentUser: false,
    helpfulCount: 0, reviewer: null, publicationStatus: 'APPROVED', createdAt: new Date(), updatedAt: new Date() })
  await act(async () => {
    await expect(result.current.mutateAsync({ wineId: 'wine', rating: 4 })).rejects.toThrow('offline')
  })
  for (const key of affected) expect(cache.getQueryState(key)?.isInvalidated).toBe(false)
  await act(async () => { await result.current.mutateAsync({ wineId: 'wine', rating: 4 }) })
  for (const key of affected) expect(cache.getQueryState(key)?.isInvalidated).toBe(true)
  for (const key of preserved) expect(cache.getQueryState(key)?.isInvalidated).toBe(false)
  unmount()
  cache.clear()
})
