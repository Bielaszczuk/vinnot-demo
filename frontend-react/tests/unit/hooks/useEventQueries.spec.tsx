/**
 * Event query hooks — unit tests
 *
 * Tests useEvents hook integration with TanStack Query.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'

vi.mock('@services/events.service', () => ({
  eventsService: {
    getEvents: vi.fn().mockResolvedValue({
      events: [
        {
          id: 'e1',
          title: 'Wine Tasting Night',
          description: 'A great tasting event',
          type: 'TASTING',
          startDate: new Date('2026-05-01'),
          endDate: new Date('2026-05-01'),
          location: {
            name: 'Bodega Central',
            address: 'Av. San Martín 100',
            city: 'Mendoza',
            region: 'Mendoza',
            country: 'Argentina',
            latitude: -32.89,
            longitude: -68.84,
          },
          organizer: { id: 'o1', name: 'Bodega Central', email: 'info@test.com', phone: null },
          imageUrl: null,
          mapEmbedUrl: null,
          price: 0,
          maxAttendees: 50,
          currentAttendees: 12,
          tags: ['tasting'],
          status: 'PUBLISHED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      pagination: {
        pageNumber: 0,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
    }),
    getNearbyEvents: vi.fn().mockResolvedValue({
      events: [],
      pagination: {
        pageNumber: 0,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    }),
    getEvent: vi.fn().mockResolvedValue({
      id: 'e1',
      title: 'Wine Tasting Night',
      description: 'A great tasting event',
      type: 'TASTING',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-01'),
      location: {
        name: 'Bodega Central',
        address: 'Av. San Martín 100',
        city: 'Mendoza',
        region: 'Mendoza',
        country: 'Argentina',
        latitude: -32.89,
        longitude: -68.84,
      },
      organizer: { id: 'o1', name: 'Bodega Central', email: 'info@test.com', phone: null },
      imageUrl: null,
      mapEmbedUrl: null,
      price: 0,
      maxAttendees: 50,
      currentAttendees: 12,
      tags: ['tasting'],
      status: 'PUBLISHED',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  },
  default: {},
}))

import { useEvents } from '@hooks/queries/event/useEvents'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches events successfully', async () => {
    const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.events).toHaveLength(1)
    expect(result.current.data?.events[0]?.title).toBe('Wine Tasting Night')
  })

  it('passes filter params to the service', async () => {
    const { eventsService } = await import('@services/events.service')
    const filter = { type: 'TASTING' as const }

    const { result } = renderHook(() => useEvents(filter, 0, 10), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(eventsService.getEvents).toHaveBeenCalledWith(filter, 0, 10)
  })

  it('returns pagination metadata', async () => {
    const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pagination.totalItems).toBe(1)
    expect(result.current.data?.pagination.hasNext).toBe(false)
  })
})

