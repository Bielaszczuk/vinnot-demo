/**
 * Integration test — Cellar CRUD flow
 *
 * Verifies cellar add/edit/remove via mock service.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'

vi.mock('@services/cellar.service', () => {
  const cellarEntry = {
    id: 'c1',
    wine: {
      id: 'w1',
      name: 'Malbec Reserva',
      winery: 'Bodega Test',
      type: 'red' as const,
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
      description: '',
      alcoholContent: 14,
      style: null,
      allergens: [] as string[],
      tastingNotes: null,
      foodPairings: [] as string[],
      awards: [] as never[],
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
    },
    rating: 4,
    purchasePrice: 20,
    notes: 'Great wine',
    addedAt: new Date(),
  }

  return {
    cellarService: {
      fetchCellar: vi.fn().mockResolvedValue([cellarEntry]),
      addWine: vi.fn().mockResolvedValue(cellarEntry),
      removeWine: vi.fn().mockResolvedValue(undefined),
      updateWine: vi.fn().mockResolvedValue({ ...cellarEntry, rating: 5, notes: 'Updated' }),
      quickAddWine: vi.fn().mockResolvedValue(cellarEntry),
    },
    default: {},
  }
})

import { useCellar } from '@hooks/queries/cellar/useCellar'
import { useUpdateCellarEntry } from '@hooks/queries/cellar/useUpdateCellarEntry'
import { useRemoveCellarEntry } from '@hooks/queries/cellar/useRemoveCellarEntry'

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

describe('Cellar CRUD Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('full lifecycle: fetch → update → remove', async () => {
    const wrapper = createWrapper()

    // 1. Fetch cellar
    const { result: cellarResult } = renderHook(() => useCellar(), { wrapper })
    await waitFor(() => expect(cellarResult.current.isSuccess).toBe(true))
    expect(cellarResult.current.data).toHaveLength(1)
    expect(cellarResult.current.data?.[0]?.wine.name).toBe('Malbec Reserva')

    // 2. Update entry
    const { result: updateResult } = renderHook(() => useUpdateCellarEntry(), { wrapper })
    await act(async () => {
      updateResult.current.mutate({ cellarWineId: 'c1', updates: { rating: 5, notes: 'Updated' } })
    })
    await waitFor(() => expect(updateResult.current.isSuccess).toBe(true))
    const { cellarService } = await import('@services/cellar.service')
    expect(cellarService.updateWine).toHaveBeenCalledWith('c1', { rating: 5, notes: 'Updated' })

    // 3. Remove entry
    const { result: removeResult } = renderHook(() => useRemoveCellarEntry(), { wrapper })
    await act(async () => {
      removeResult.current.mutate('c1')
    })
    await waitFor(() => expect(removeResult.current.isSuccess).toBe(true))
    expect(cellarService.removeWine).toHaveBeenCalledWith('c1')
  })
})
