import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { AdminWine } from '@domain/admin/admin.types'
import { toAdminWineFormValues } from '@domain/admin/adminWineForm'
import { useAdminWinesViewModel } from '../useAdminWinesViewModel'

const mocks = vi.hoisted(() => ({
  create: { mutateAsync: vi.fn(), isPending: false },
  update: { mutateAsync: vi.fn(), isPending: false },
  detail: vi.fn(),
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US' } }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }))
vi.mock('@hooks/queries/admin/useAdminWines', () => ({ useAdminWines: () => ({ data: { items: [], totalItems: 0 }, isLoading: false, isError: false, refetch: vi.fn() }) }))
vi.mock('@hooks/queries/wine/useWineTypes', () => ({ useWineTypes: () => ({ data: [] }) }))
vi.mock('@hooks/queries/admin/useAdminWineMutations', () => ({
  useCreateAdminWine: () => mocks.create,
  useUpdateAdminWine: () => mocks.update,
  useDeleteAdminWine: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@hooks/queries/admin/useAdminLookupMutations', () => ({
  useAdminWinerySearch: () => ({ mutateAsync: vi.fn() }),
  useAdminWineDetailMutation: () => ({ mutateAsync: mocks.detail }),
}))

const stored: AdminWine = {
  id: 'wine-1', name: 'Gran Malbec', vintage: 2019, wineType: 'RED', wineryId: 'winery-1', wineryName: 'Bodega Norte',
  region: 'Mendoza', country: 'Argentina', style: 'Reserva', grapes: ['Malbec', 'Cabernet Franc'], allergens: ['SULFITES'],
  alcoholContent: 14.5, descriptionEn: null, descriptionEs: 'Intenso y frutado', imageUrl: 'https://cdn.example/wine-1.jpg',
  priceMin: 12000, priceMax: 18000, ratingAverage: 4.2, isFeatured: true, isActive: false, createdAt: '2026-01-01',
  acidityScore: 60, tanninScore: null, bodyScore: 80, sweetnessScore: 5,
}

beforeEach(() => vi.clearAllMocks())

it('saves an untouched existing wine with exactly the payload the previous form sent', async () => {
  mocks.detail.mockResolvedValueOnce(stored)
  const { result } = renderHook(() => useAdminWinesViewModel({ navigate: vi.fn() }))
  await act(() => result.current.openEdit(stored))
  await act(async () => { await result.current.saveWine(toAdminWineFormValues(result.current.editingWine!)) })
  expect(mocks.update.mutateAsync).toHaveBeenCalledWith({
    id: 'wine-1',
    payload: {
      name: 'Gran Malbec', wineType: 'RED', wineryId: 'winery-1', vintage: 2019, style: 'Reserva',
      grapes: ['Malbec', 'Cabernet Franc'], allergens: ['SULFITES'], alcoholContent: 14.5,
      descriptionEn: null, descriptionEs: 'Intenso y frutado', imageUrl: 'https://cdn.example/wine-1.jpg',
      priceMin: 12000, priceMax: 18000, isFeatured: true, isActive: false,
      acidityScore: 60, tanninScore: null, bodyScore: 80, sweetnessScore: 5,
    },
  })
  expect(result.current.editingWine).toBeNull()
})

it('creates a wine with the same payload shape, empty optionals as null and untouched scores empty', async () => {
  const { result } = renderHook(() => useAdminWinesViewModel({ navigate: vi.fn() }))
  act(() => result.current.openCreate())
  const values = { ...toAdminWineFormValues(result.current.editingWine!), name: ' Malbec Joven ', wineryId: 'winery-2', wineryName: 'Bodega Sur' }
  await act(async () => { await result.current.saveWine(values) })
  expect(mocks.create.mutateAsync).toHaveBeenCalledWith({
    name: 'Malbec Joven', wineType: 'RED', wineryId: 'winery-2', vintage: null, style: null, grapes: [], allergens: [],
    alcoholContent: null, descriptionEn: null, descriptionEs: null, imageUrl: null, priceMin: null, priceMax: null,
    isFeatured: false, isActive: true, acidityScore: null, tanninScore: null, bodyScore: null, sweetnessScore: null,
  })
})

it('keeps the editor open when the save fails', async () => {
  mocks.create.mutateAsync.mockRejectedValueOnce(new Error('boom'))
  const { result } = renderHook(() => useAdminWinesViewModel({ navigate: vi.fn() }))
  act(() => result.current.openCreate())
  let saved: boolean | undefined
  await act(async () => { saved = await result.current.saveWine({ ...toAdminWineFormValues(result.current.editingWine!), name: 'X', wineryId: 'w' }) })
  expect(saved).toBe(false)
  expect(result.current.editingWine).not.toBeNull()
})
