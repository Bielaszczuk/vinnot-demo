/**
 * Cellar query hooks — unit tests
 *
 * Tests useCellar, useUpdateCellarEntry, useRemoveCellarEntry.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'

vi.mock('@services/cellar.service', () => ({
  cellarService: {
    fetchCellar: vi.fn().mockResolvedValue([
      {
        id: 'c1',
        wine: {
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
          description: '',
          alcoholContent: 14,
          style: null,
          allergens: [],
          tastingNotes: null,
          foodPairings: [],
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
        },
        rating: 4,
        purchasePrice: 20,
        notes: 'Great wine',
        addedAt: new Date(),
      },
    ]),
    addWine: vi.fn().mockResolvedValue({
      id: 'c1',
      wine: {
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
        description: '',
        alcoholContent: 14,
        style: null,
        allergens: [],
        tastingNotes: null,
        foodPairings: [],
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
      },
      rating: 4,
      purchasePrice: 20,
      notes: 'Great wine',
      addedAt: new Date(),
    }),
    removeWine: vi.fn().mockResolvedValue(undefined),
    updateWine: vi.fn().mockResolvedValue({ id: 'c1', rating: 5, notes: 'Updated notes' }),
    quickAddWine: vi.fn().mockResolvedValue({ id: 'c1' }),
  },
  default: {},
}))

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

describe('useCellar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches cellar entries successfully', async () => {
    const { result } = renderHook(() => useCellar(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0]?.wine.name).toBe('Malbec Reserva')
    expect(result.current.data?.[0]?.rating).toBe(4)
  })
})

describe('useUpdateCellarEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates cellar entry via mutation', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useUpdateCellarEntry(), { wrapper })

    await act(async () => {
      result.current.mutate({
        cellarWineId: 'c1',
        updates: { rating: 5, notes: 'Updated notes' },
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const { cellarService } = await import('@services/cellar.service')
    expect(cellarService.updateWine).toHaveBeenCalledWith('c1', { rating: 5, notes: 'Updated notes' })
  })
})

describe('useRemoveCellarEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes cellar entry via mutation', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useRemoveCellarEntry(), { wrapper })

    await act(async () => {
      result.current.mutate('c1')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const { cellarService } = await import('@services/cellar.service')
    expect(cellarService.removeWine).toHaveBeenCalledWith('c1')
  })
})
