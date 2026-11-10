import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useAdminWinesViewModel } from './useAdminWinesViewModel'
const mocks = vi.hoisted(() => ({ search: vi.fn(), mutation: { mutateAsync: vi.fn(), isPending: false } }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }))
vi.mock('@hooks/queries/admin/useAdminEditorSession', () => ({ useAdminEditorSession: () => ({}) }))
vi.mock('@hooks/queries/admin/useAdminWines', () => ({ useAdminWines: () => ({ data: { items: [], totalItems: 0 }, isLoading: false, isError: false, refetch: vi.fn() }) }))
vi.mock('@hooks/queries/admin/useAdminWineMutations', () => ({
  useCreateAdminWine: () => mocks.mutation,
  useUpdateAdminWine: () => mocks.mutation,
  useDeleteAdminWine: () => mocks.mutation,
}))
vi.mock('@hooks/queries/wine/useWineTypes', () => ({
  useWineTypes: () => ({ data: [{ code: 'RED', value: 'red', names: { es: 'Tinto', en: 'Red' } }, { code: 'ORANGE', value: 'orange', names: { es: 'Naranja', en: 'Orange' } }] }),
}))
vi.mock('@hooks/queries/admin/useAdminLookupMutations', () => ({
  useAdminWinerySearch: () => ({ mutateAsync: mocks.search }),
  useAdminWineDetailMutation: () => ({ mutateAsync: vi.fn() }),
}))

it('ignores a slow winery search that finishes after a newer one', async () => {
  vi.useFakeTimers()
  try {
    let resolveOld!: (value: unknown) => void
    mocks.search
      .mockReturnValueOnce(new Promise(done => { resolveOld = done }))
      .mockResolvedValueOnce({ items: [{ id: 'new', name: 'Newer winery' }] })
    const { result } = renderHook(() => useAdminWinesViewModel({ navigate: vi.fn() }))
    act(() => result.current.setWinerySearch('Old'))
    await act(async () => { vi.advanceTimersByTime(300) })
    act(() => result.current.setWinerySearch('Newer'))
    await act(async () => { vi.advanceTimersByTime(300) })
    await act(async () => { resolveOld({ items: [{ id: 'old', name: 'Old winery' }] }) })
    expect(result.current.wineryResults).toEqual([{ id: 'new', name: 'Newer winery' }])
  } finally {
    vi.useRealTimers()
  }
})

it('offers the reference catalog wine types in the editor, orange included', () => {
  const { result } = renderHook(() => useAdminWinesViewModel({ navigate: vi.fn() }))
  expect(result.current.wineTypeOptions).toEqual([
    { value: 'RED', label: 'wines.types.red' },
    { value: 'ORANGE', label: 'wines.types.orange' },
  ])
})
