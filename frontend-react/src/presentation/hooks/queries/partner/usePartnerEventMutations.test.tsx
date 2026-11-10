import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { partnerService } from '@services/partner.service'
import type { PartnerEventPayload } from '@domain/partner/partner.types'
import { queryKeys } from '../queryKeys'
import { useCreatePartnerEvent, useDeletePartnerEvent, useUpdatePartnerEvent } from './usePartnerEventMutations'

vi.mock('@services/partner.service', () => ({ partnerService: {
  createEvent: vi.fn(), updateEvent: vi.fn(), deleteEvent: vi.fn(),
} }))
afterEach(() => vi.resetAllMocks())

describe('partner event view consistency', () => {
  it.each(['create', 'update', 'delete'] as const)('%s refreshes public event views only on success', async (operation) => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const affected = [queryKeys.partner.events.list({}), queryKeys.events.list({}),
      queryKeys.events.nearby({}), queryKeys.events.discovery({}), queryKeys.admin.events.list({}), queryKeys.admin.stats()]
    const detail = queryKeys.events.detail('a')
    const unrelated = [queryKeys.events.detail('b'), queryKeys.wines.list({}), queryKeys.admin.users.list({}), queryKeys.wines.comparison('a', 'b', 'es')]
    for (const key of [...affected, detail, ...unrelated]) client.setQueryData(key, { id: 'a' })
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result, unmount } = renderHook(() => ({
      create: useCreatePartnerEvent(), update: useUpdatePartnerEvent(), delete: useDeletePartnerEvent(),
    }), { wrapper })
    const service = operation === 'create' ? partnerService.createEvent : operation === 'update' ? partnerService.updateEvent : partnerService.deleteEvent
    const mutate = () => operation === 'create' ? result.current.create.mutateAsync({} as PartnerEventPayload)
      : operation === 'update' ? result.current.update.mutateAsync({ id: 'a', payload: {} as PartnerEventPayload })
        : result.current.delete.mutateAsync({ id: 'a', cancellation: { reason: 'WEATHER' } })
    try {
      vi.mocked(service).mockRejectedValueOnce(new Error('offline'))
      await act(async () => { await expect(mutate()).rejects.toThrow('offline') })
      expect(client.getQueryCache().getAll().every((query) => !query.state.isInvalidated)).toBe(true)
      // Delete intentionally returns no data: success must still invalidate.
      vi.mocked(service).mockResolvedValueOnce(undefined as never)
      await act(async () => { await mutate() })
      affected.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true))
      expect(client.getQueryState(detail)?.isInvalidated).toBe(operation !== 'create')
      unrelated.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(false))
      if (operation === 'delete') expect(service).toHaveBeenLastCalledWith('a', { reason: 'WEATHER' })
    } finally { unmount(); client.clear() }
  })
})
