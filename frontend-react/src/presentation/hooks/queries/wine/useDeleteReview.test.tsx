import { createElement, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { winesService } from '@services/wines.service'
import { queryKeys } from '../queryKeys'
import { useDeleteReview } from './useDeleteReview'

afterEach(() => vi.restoreAllMocks())
it('refreshes public ratings and pending moderation after success, preserving caches after failure', async () => {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const affected = [queryKeys.wines.detail('wine'), queryKeys.wines.reviews('wine'),
    queryKeys.wines.list({ countryId: 'ar' }), queryKeys.cellar.all, ['community', 'operator', 'publications'],
    ['community', 'operator', 'moderationOverview']]
  const preserved = [queryKeys.wines.detail('other'), queryKeys.wines.comparison('a', 'b', 'es')]
  for (const key of [...affected, ...preserved]) cache.setQueryData(key, 'cached')
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: cache }, children)
  const { result, unmount } = renderHook(() => useDeleteReview(), { wrapper })
  vi.spyOn(winesService, 'deleteReview').mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(undefined)
  await act(async () => {
    await expect(result.current.mutateAsync({ wineId: 'wine', reviewId: 'review' })).rejects.toThrow('offline')
  })
  for (const key of affected) expect(cache.getQueryState(key)?.isInvalidated).toBe(false)
  await act(async () => { await result.current.mutateAsync({ wineId: 'wine', reviewId: 'review' }) })
  for (const key of affected) expect(cache.getQueryState(key)?.isInvalidated).toBe(true)
  for (const key of preserved) expect(cache.getQueryState(key)?.isInvalidated).toBe(false)
  unmount()
  cache.clear()
})
