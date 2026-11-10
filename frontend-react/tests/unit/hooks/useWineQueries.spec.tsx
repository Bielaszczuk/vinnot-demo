/**
 * Wine query hooks — unit tests
 *
 * Tests useWines and useWineSearch hook integration with TanStack Query.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'

// Mock the wines service
vi.mock('@services/wines.service', () => ({
  winesService: {
    getWines: vi.fn().mockResolvedValue({
      wines: [
        {
          id: 'w1',
          name: 'Malbec Reserva',
          winery: 'Bodega Test',
          type: 'red',
          region: 'Mendoza',
          country: 'Argentina',
          grapeVarieties: ['Malbec'],
          vintage: 2020,
          price: 25,
          rating: 4.5,
          reviewCount: 12,
          imageUrl: null,
          isNatural: false,
          bottleImageUrl: null,
          seoName: null,
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
    getWine: vi.fn().mockResolvedValue({
      id: 'w1',
      name: 'Malbec Reserva',
      winery: 'Bodega Test',
      type: 'red',
      region: 'Mendoza',
      country: 'Argentina',
      grapeVarieties: ['Malbec'],
      vintage: 2020,
      price: 25,
      rating: 4.5,
      reviewCount: 12,
      imageUrl: null,
      isNatural: false,
      bottleImageUrl: null,
      seoName: null,
      description: 'A fine Malbec.',
      alcoholContent: 14,
      style: 'Reserva',
      allergens: [],
      tastingNotes: null,
      foodPairings: ['Steak'],
      awards: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      wineryId: null,
      externalUrl: null,
      foodPairing: null,
      bestVintageYear: null,
      bestVintageRating: null,
      regionId: null,
      regionName: null,
      countryId: null,
      countryName: null,
      acidityScore: null,
      tanninScore: null,
      bodyScore: null,
      sweetnessScore: null,
    }),
  },
  default: {},
}))

import { useWines } from '@hooks/queries/wine/useWines'
import { useWineSearch } from '@hooks/queries/wine/useWineSearch'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

function createWrapper() {
  const queryClient = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useWines', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches wines successfully', async () => {
    const { result } = renderHook(() => useWines(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.wines).toHaveLength(1)
    expect(result.current.data?.wines[0]?.name).toBe('Malbec Reserva')
    expect(result.current.data?.pagination.totalItems).toBe(1)
  })

  it('passes filter and pagination params', async () => {
    const { winesService } = await import('@services/wines.service')
    const filter = { type: 'red' as const, region: 'Mendoza' }

    const { result } = renderHook(() => useWines(filter, 1, 10), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(winesService.getWines).toHaveBeenCalledWith(filter, 1, 10)
  })
})

describe('useWineSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces search term and fetches wines', async () => {
    vi.useRealTimers()

    const { result } = renderHook(
      () => useWineSearch('Malbec'),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 2000 })

    expect(result.current.data?.wines).toBeDefined()
  })
})

