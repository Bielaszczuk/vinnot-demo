import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useAdminRoutesViewModel } from './useAdminRoutesViewModel'
const mocks = vi.hoisted(() => ({ toast: vi.fn(), save: vi.fn(), detail: vi.fn(), search: vi.fn() }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ hasRole: () => true }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/queries/admin/useAdminRoutes', () => ({ useAdminRoutes: () => ({ data: { items: [], totalItems: 0 } }) }))
vi.mock('@hooks/queries/admin/useAdminLookupMutations', () => ({ useAdminRouteDetailMutation: () => ({ mutateAsync: mocks.detail }), useAdminWinerySearch: () => ({ mutateAsync: mocks.search }) }))
vi.mock('@hooks/queries/admin/useAdminRouteMutations', () => ({
  useCreateAdminRoute: () => ({ mutateAsync: mocks.save }),
  useUpdateAdminRoute: () => ({ mutateAsync: mocks.save }),
  useDeleteAdminRoute: () => ({ mutateAsync: mocks.save }),
}))

it('ignores a slow winery search that finishes after a newer one', async () => {
  vi.useFakeTimers()
  try {
    let resolveOld!: (value: unknown) => void
    mocks.search
      .mockReturnValueOnce(new Promise(done => { resolveOld = done }))
      .mockResolvedValueOnce({ items: [{ id: 'new', name: 'Newer winery' }] })
    const { result } = renderHook(useAdminRoutesViewModel)
    act(() => result.current.wineryPicker.setQuery('Old'))
    await act(async () => { vi.advanceTimersByTime(300) })
    act(() => result.current.wineryPicker.setQuery('Newer'))
    await act(async () => { vi.advanceTimersByTime(300) })
    await act(async () => { resolveOld({ items: [{ id: 'old', name: 'Old winery' }] }) })
    expect(result.current.wineryPicker.results).toEqual([{ id: 'new', name: 'Newer winery' }])
    expect(result.current.wineryPicker.loading).toBe(false)
  } finally {
    vi.useRealTimers()
  }
})

it('reports a route that fails to load and leaves the editor closed', async () => {
  mocks.detail.mockRejectedValueOnce(new Error('offline'))
  const { result } = renderHook(useAdminRoutesViewModel)
  await act(async () => { await result.current.openEdit({ id: 'route-1' } as never) })
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: 'admin.feedback.loadError' })
  expect(result.current.editingRoute).toBeNull()
  expect(result.current.loadingDetail).toBe(false)
})
