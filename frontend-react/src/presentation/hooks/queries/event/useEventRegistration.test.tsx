import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { eventsService } from '@services/events.service'
import type { EventRegistration } from '@domain/event/event.types'
import { queryKeys } from '@hooks/queries/queryKeys'
import { useMyEventRegistration } from './useEventRegistration'

vi.mock('@services/events.service', () => ({ eventsService: { getMyRegistration: vi.fn() } }))

describe('registration settlement cache', () => {
  it.each(['AWAITING_PAYMENT', 'CONFIRMED', undefined] as const)(
    'refreshes event capacity only for a status transition from %s', async status => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const registration = { id: 'registration', status: 'CONFIRMED' } as EventRegistration
      if (status) client.setQueryData(queryKeys.events.myRegistration('event'), { ...registration, status })
      vi.mocked(eventsService.getMyRegistration).mockResolvedValue(registration)
      const invalidate = vi.spyOn(client, 'invalidateQueries')
      const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
      const { result, unmount } = renderHook(() => useMyEventRegistration('event', true), { wrapper })
      await waitFor(() => expect(result.current.isFetching).toBe(false))
      expect(result.current.data?.status).toBe('CONFIRMED')
      if (status === 'AWAITING_PAYMENT') {
        expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: queryKeys.events.detail('event'), exact: true })
      } else expect(invalidate).not.toHaveBeenCalled()
      unmount()
      client.clear()
    },
  )
})
