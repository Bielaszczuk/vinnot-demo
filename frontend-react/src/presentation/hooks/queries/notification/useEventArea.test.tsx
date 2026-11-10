import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { notificationsService } from '@services/notifications.service'
import { queryKeys } from '../queryKeys'
import { useEventArea, useUpdateEventArea } from './useEventArea'

vi.mock('@services/notifications.service', () => ({
  notificationsService: { getEventArea: vi.fn(), setEventAreaRegion: vi.fn(), clearEventArea: vi.fn() },
}))
afterEach(() => vi.resetAllMocks())

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

it('reads the area only when enabled', async () => {
  vi.mocked(notificationsService.getEventArea).mockResolvedValue({ kind: 'REGION', regionId: 'r1', regionName: 'Mendoza' })
  const { client, wrapper } = setup()
  const { result, rerender } = renderHook(({ enabled }) => useEventArea(enabled), { wrapper, initialProps: { enabled: false } })
  expect(notificationsService.getEventArea).not.toHaveBeenCalled()

  rerender({ enabled: true })

  await waitFor(() => expect(result.current.data).toEqual({ kind: 'REGION', regionId: 'r1', regionName: 'Mendoza' }))
  expect(notificationsService.getEventArea).toHaveBeenCalledOnce()
  client.clear()
})

it('sets a region or clears the area and re-reads it either way', async () => {
  vi.mocked(notificationsService.setEventAreaRegion).mockResolvedValue(undefined)
  vi.mocked(notificationsService.clearEventArea).mockRejectedValue(new Error('offline'))
  const { client, wrapper } = setup()
  client.setQueryData(queryKeys.users.eventArea(), null)
  const { result } = renderHook(useUpdateEventArea, { wrapper })

  await act(async () => { await result.current.mutateAsync({ type: 'region', regionId: 'r2' }) })
  expect(notificationsService.setEventAreaRegion).toHaveBeenCalledExactlyOnceWith('r2')
  expect(client.getQueryState(queryKeys.users.eventArea())?.isInvalidated).toBe(true)

  client.setQueryData(queryKeys.users.eventArea(), null)
  await act(async () => { await result.current.mutateAsync({ type: 'clear' }).catch(() => undefined) })
  expect(notificationsService.clearEventArea).toHaveBeenCalledOnce()
  expect(client.getQueryState(queryKeys.users.eventArea())?.isInvalidated).toBe(true)
  client.clear()
})
