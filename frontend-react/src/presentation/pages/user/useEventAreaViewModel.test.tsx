import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useEventAreaViewModel } from './useEventAreaViewModel'
import { notificationsService } from '@services/notifications.service'
import { regionsService } from '@services/regions.service'

const addToast = vi.fn()
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@services/notifications.service', () => ({
  notificationsService: { getEventArea: vi.fn(), setEventAreaRegion: vi.fn(), clearEventArea: vi.fn() },
}))
vi.mock('@services/regions.service', () => ({ regionsService: { getRegions: vi.fn() } }))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(regionsService.getRegions).mockResolvedValue([
    { id: 'r-1', name: 'Valle de Uco', countryId: 'c-1', countryCode: 'AR', countryName: 'Argentina' },
  ])
})

it('exposes the stored region as the selection and the regions as one-tap options', async () => {
  vi.mocked(notificationsService.getEventArea).mockResolvedValue({ kind: 'REGION', regionId: 'r-1', regionName: 'Valle de Uco' })
  const { result } = renderHook(() => useEventAreaViewModel(), { wrapper })

  await waitFor(() => expect(result.current.options).toHaveLength(1))
  await waitFor(() => expect(result.current.selectedRegionId).toBe('r-1'))
  expect(result.current.options[0]).toEqual({ value: 'r-1', label: 'Valle de Uco, Argentina' })
  expect(result.current.hasArea).toBe(true)
  expect(result.current.isApproximate).toBe(false)
})

it('does not send a change for the current region, an empty pick or a clear without an area', async () => {
  vi.mocked(notificationsService.getEventArea).mockResolvedValue({ kind: 'REGION', regionId: 'r-1', regionName: 'Valle de Uco' })
  const { result } = renderHook(() => useEventAreaViewModel(), { wrapper })
  await waitFor(() => expect(result.current.hasArea).toBe(true))

  act(() => result.current.selectRegion('r-1'))
  act(() => result.current.selectRegion(''))
  expect(notificationsService.setEventAreaRegion).not.toHaveBeenCalled()

  vi.mocked(notificationsService.getEventArea).mockResolvedValue(null)
  const empty = renderHook(() => useEventAreaViewModel(), { wrapper })
  await waitFor(() => expect(empty.result.current.isLoading).toBe(false))
  act(() => empty.result.current.clear())
  expect(notificationsService.clearEventArea).not.toHaveBeenCalled()
})

it('reports a failed clear', async () => {
  vi.mocked(notificationsService.getEventArea).mockResolvedValue({ kind: 'APPROXIMATE' })
  vi.mocked(notificationsService.clearEventArea).mockRejectedValue(new Error('503'))
  const { result } = renderHook(() => useEventAreaViewModel(), { wrapper })
  await waitFor(() => expect(result.current.isApproximate).toBe(true))

  act(() => result.current.clear())

  await waitFor(() => expect(addToast).toHaveBeenCalledWith({ type: 'error', message: 'notificationPreferences.eventArea.saveError' }))
})

it('surfaces a failed regions catalogue as the error to retry', async () => {
  vi.mocked(notificationsService.getEventArea).mockResolvedValue(null)
  vi.mocked(regionsService.getRegions).mockRejectedValueOnce(new Error('503'))
  const { result } = renderHook(() => useEventAreaViewModel(), { wrapper })

  await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))
  act(() => result.current.retry())

  await waitFor(() => expect(result.current.error).toBeNull())
  expect(regionsService.getRegions).toHaveBeenCalledTimes(2)
})
