import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { adminNotificationsService } from '@services/adminNotifications.service'
import { useAnnouncementDetail } from './useAdminNotifications'

vi.mock('@services/adminNotifications.service', () => ({ adminNotificationsService: { getAnnouncement: vi.fn() } }))
afterEach(() => vi.resetAllMocks())

function setup(initialId: string | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const hook = renderHook(({ id }) => useAnnouncementDetail(id), { wrapper, initialProps: { id: initialId } })
  return { client, ...hook }
}

it('reads one announcement only once one is chosen, and an announcement that no longer exists as none', async () => {
  vi.mocked(adminNotificationsService.getAnnouncement).mockResolvedValue(null)
  const { result, rerender, client, unmount } = setup(null)
  expect(result.current.fetchStatus).toBe('idle')
  expect(adminNotificationsService.getAnnouncement).not.toHaveBeenCalled()

  rerender({ id: 'gone' })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toBeNull()
  expect(adminNotificationsService.getAnnouncement).toHaveBeenCalledExactlyOnceWith('gone')
  unmount()
  client.clear()
})

it('polls an announcement while it is still being sent', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const sending = { id: 'a1', completedAt: null }
  vi.mocked(adminNotificationsService.getAnnouncement).mockResolvedValue(sending as never)
  const { result, client, unmount } = setup('a1')
  await waitFor(() => expect(result.current.isSuccess).toBe(true))

  await vi.advanceTimersByTimeAsync(10_000)

  await waitFor(() => expect(adminNotificationsService.getAnnouncement).toHaveBeenCalledTimes(2))
  unmount()
  client.clear()
  vi.useRealTimers()
})
