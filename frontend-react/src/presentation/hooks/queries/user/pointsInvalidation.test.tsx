import { createElement, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { winesService } from '@services/wines.service'
import { cellarService } from '@services/cellar.service'
import { eventsService } from '@services/events.service'
import { usersService } from '@services/users.service'
import { pointsService } from '@services/points.service'
import { queryKeys } from '../queryKeys'
import { useUpdateReview } from '../wine/useUpdateReview'
import { useDeleteReview } from '../wine/useDeleteReview'
import { useToggleReviewLike } from '../wine/useToggleReviewLike'
import { useCreateReviewComment } from '../wine/useCreateReviewComment'
import { useDeleteReviewComment } from '../wine/useDeleteReviewComment'
import { useCellarQuickAdd } from '../wine/useCellarQuickAdd'
import { useRegisterForEvent } from '../event/useRegisterForEvent'
import { useCancelRegistration } from '../event/useCancelRegistration'
import { useUpdateProfile } from './useUpdateProfile'
import { useUploadAvatar } from './useUploadAvatar'
import { useMyPoints } from './useMyPoints'
import { usePointsAcknowledgement } from './usePointsAcknowledgement'

afterEach(() => vi.restoreAllMocks())

function setup() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client: cache }, children)
  return { cache, wrapper }
}

const stale = (cache: QueryClient, key: readonly unknown[]) => cache.getQueryState(key)?.isInvalidated

/** Each awarding mutation keeps its previous refresh and now refreshes the points too. */
const cases: Array<{
  name: string
  run: (wrapper: (props: PropsWithChildren) => React.ReactElement) => Promise<void>
  previous: readonly unknown[]
}> = [
  {
    name: 'updating a review',
    previous: queryKeys.cellar.all,
    run: async (wrapper) => {
      vi.spyOn(winesService, 'updateReview').mockResolvedValue({} as never)
      const { result } = renderHook(() => useUpdateReview(), { wrapper })
      await act(async () => { await result.current.mutateAsync({ wineId: 'w', reviewId: 'r', rating: 3.6 }) })
    },
  },
  {
    name: 'deleting a review',
    previous: queryKeys.wines.detail('w'),
    run: async (wrapper) => {
      vi.spyOn(winesService, 'deleteReview').mockResolvedValue()
      const { result } = renderHook(() => useDeleteReview(), { wrapper })
      await act(async () => { await result.current.mutateAsync({ wineId: 'w', reviewId: 'r' }) })
    },
  },
  {
    name: 'liking a review',
    previous: queryKeys.wines.detail('w'),
    run: async (wrapper) => {
      vi.spyOn(winesService, 'markReviewHelpful').mockResolvedValue(undefined as never)
      const { result } = renderHook(() => useToggleReviewLike(), { wrapper })
      await act(async () => { await result.current.mutateAsync({ wineId: 'w', reviewId: 'r', liked: false }) })
    },
  },
  {
    name: 'commenting',
    previous: queryKeys.wines.reviewComments('w', 'r'),
    run: async (wrapper) => {
      vi.spyOn(winesService, 'addReviewComment').mockResolvedValue({} as never)
      const { result } = renderHook(() => useCreateReviewComment(), { wrapper })
      await act(async () => { await result.current.mutateAsync({ wineId: 'w', reviewId: 'r', content: 'Nice' }) })
    },
  },
  {
    name: 'deleting a comment',
    previous: queryKeys.wines.reviewComments('w', 'r'),
    run: async (wrapper) => {
      vi.spyOn(winesService, 'deleteReviewComment').mockResolvedValue()
      const { result } = renderHook(() => useDeleteReviewComment(), { wrapper })
      await act(async () => { await result.current.mutateAsync({ wineId: 'w', reviewId: 'r', commentId: 'c' }) })
    },
  },
  {
    name: 'adding to the cellar',
    previous: queryKeys.cellar.all,
    run: async (wrapper) => {
      vi.spyOn(cellarService, 'quickAddWine').mockResolvedValue({} as never)
      const { result } = renderHook(() => useCellarQuickAdd(), { wrapper })
      await act(async () => { await result.current.mutateAsync({ wineId: 'w', rating: 4.2, purchasePrice: null, notes: null }) })
    },
  },
  {
    name: 'registering for an event',
    previous: queryKeys.events.detail('e'),
    run: async (wrapper) => {
      vi.spyOn(eventsService, 'registerForEvent').mockResolvedValue({ userId: 'u' } as never)
      const { result } = renderHook(() => useRegisterForEvent(), { wrapper })
      await act(async () => { await result.current.mutateAsync({ eventId: 'e', input: {} as never }) })
    },
  },
  {
    name: 'cancelling a registration',
    previous: queryKeys.events.detail('e'),
    run: async (wrapper) => {
      vi.spyOn(eventsService, 'cancelRegistration').mockResolvedValue()
      const { result } = renderHook(() => useCancelRegistration(), { wrapper })
      await act(async () => { await result.current.mutateAsync('e') })
    },
  },
]

describe('points refresh after awarding actions', () => {
  it.each(cases)('$name keeps its previous refresh and refreshes the points', async ({ run, previous }) => {
    const { cache, wrapper } = setup()
    cache.setQueryData(previous, 'cached')
    cache.setQueryData(queryKeys.users.myPoints(), 'cached')
    cache.setQueryData(queryKeys.users.myStats(), 'cached')
    await run(wrapper)
    expect(stale(cache, previous)).toBe(true)
    expect(stale(cache, queryKeys.users.myPoints())).toBe(true)
    cache.clear()
  })

  it('refreshes the points after a profile update and an avatar upload, still syncing the session user', async () => {
    const { cache, wrapper } = setup()
    vi.spyOn(usersService, 'updateUser').mockResolvedValue({ id: 'u', username: 'ana' } as never)
    vi.spyOn(usersService, 'uploadAvatar').mockResolvedValue('/avatar.webp')
    cache.setQueryData(queryKeys.users.myPoints(), 'cached')
    const profile = renderHook(() => useUpdateProfile(), { wrapper })
    await act(async () => { await profile.result.current.mutateAsync({ username: 'ana', firstName: 'Ana', lastName: 'Paz' }) })
    expect(stale(cache, queryKeys.users.myPoints())).toBe(true)
    cache.setQueryData(queryKeys.users.myPoints(), 'cached')
    const avatar = renderHook(() => useUploadAvatar(), { wrapper })
    await act(async () => { await avatar.result.current.mutateAsync(new File(['x'], 'a.png')) })
    expect(stale(cache, queryKeys.users.myPoints())).toBe(true)
    cache.clear()
  })
})

describe('points queries', () => {
  it('reads the points only when enabled', async () => {
    const read = vi.spyOn(pointsService, 'getMyPoints').mockResolvedValue({ points: 3 } as never)
    const { wrapper } = setup()
    const off = renderHook(() => useMyPoints(false), { wrapper })
    expect(off.result.current.fetchStatus).toBe('idle')
    expect(read).not.toHaveBeenCalled()
    const on = renderHook(() => useMyPoints(), { wrapper })
    await vi.waitFor(() => expect(on.result.current.data).toEqual({ points: 3 }))
  })

  it('clears the pending celebration or the welcome card at once and records them', async () => {
    const { cache, wrapper } = setup()
    vi.spyOn(pointsService, 'getMyPoints').mockResolvedValue({ pendingCelebration: null, showWelcome: false } as never)
    vi.spyOn(pointsService, 'markCelebrated').mockResolvedValue()
    vi.spyOn(pointsService, 'dismissWelcome').mockResolvedValue()
    cache.setQueryData(queryKeys.users.myPoints(), { pendingCelebration: 'RESERVA', showWelcome: true })
    const { result } = renderHook(() => usePointsAcknowledgement(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ tier: 'RESERVA' }) })
    expect(pointsService.markCelebrated).toHaveBeenCalledWith('RESERVA')
    cache.setQueryData(queryKeys.users.myPoints(), { pendingCelebration: null, showWelcome: true })
    const pending = result.current.mutateAsync({ welcome: true })
    expect(cache.getQueryData(queryKeys.users.myPoints())).toEqual({ pendingCelebration: null, showWelcome: false })
    await act(async () => { await pending })
    expect(pointsService.dismissWelcome).toHaveBeenCalledTimes(1)
    expect(stale(cache, queryKeys.users.myPoints())).toBe(true)
    cache.clear()
  })

  it('leaves an empty cache alone when acknowledging', async () => {
    const { cache, wrapper } = setup()
    vi.spyOn(pointsService, 'markCelebrated').mockResolvedValue()
    const { result } = renderHook(() => usePointsAcknowledgement(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ tier: 'BROTE' }) })
    expect(cache.getQueryData(queryKeys.users.myPoints())).toBeUndefined()
  })
})
