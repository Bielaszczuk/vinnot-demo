import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { adminService } from '@services/admin.service'
import { queryKeys } from '../queryKeys'
import { useDeleteAdminEvent } from './useAdminEventMutations'

vi.mock('@services/admin.service', () => ({ adminService: { deleteEvent: vi.fn() } }))
afterEach(() => vi.resetAllMocks())

it('cancels an admin event with the chosen reason and refreshes event views', async () => {
  vi.mocked(adminService.deleteEvent).mockResolvedValue(undefined)
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  client.setQueryData(queryKeys.admin.events.list({}), { id: 'a' })
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { result, unmount } = renderHook(useDeleteAdminEvent, { wrapper })
  await act(async () => {
    await result.current.mutateAsync({ id: 'a', cancellation: { reason: 'OTHER', note: 'Private booking' } })
  })
  expect(adminService.deleteEvent).toHaveBeenCalledExactlyOnceWith('a', { reason: 'OTHER', note: 'Private booking' })
  expect(client.getQueryState(queryKeys.admin.events.list({}))?.isInvalidated).toBe(true)
  unmount()
  client.clear()
})
