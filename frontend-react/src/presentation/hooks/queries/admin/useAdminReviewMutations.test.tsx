import { createElement, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { adminService } from '@services/admin.service'
import { queryKeys } from '../queryKeys'
import { useDeleteAdminReview } from './useAdminReviewMutations'

afterEach(() => vi.restoreAllMocks())
it('updates cellar review availability after an administrative deletion succeeds', async () => {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  cache.setQueryData(queryKeys.cellar.all, [{ id: 'entry', reviewId: 'review' }])
  const wrapper = ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client: cache }, children)
  const { result, unmount } = renderHook(() => useDeleteAdminReview(), { wrapper })
  vi.spyOn(adminService, 'deleteReview').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined)
  await act(async () => { await expect(result.current.mutateAsync('review')).rejects.toThrow('offline') })
  expect(cache.getQueryState(queryKeys.cellar.all)?.isInvalidated).toBe(false)
  await act(async () => { await result.current.mutateAsync('review') })
  expect(cache.getQueryState(queryKeys.cellar.all)?.isInvalidated).toBe(true)
  unmount()
  cache.clear()
})
