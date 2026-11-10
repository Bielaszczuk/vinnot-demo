import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WineSummary } from '@domain/wine/wine.types'
import { useWineCompareViewModel } from './useWineCompareViewModel'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(), comparison: vi.fn(), params: { wineAId: 'a' as string | undefined }, search: '',
}))
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => ({ state: null }),
  useParams: () => mocks.params,
  useSearchParams: () => [new URLSearchParams(mocks.search)],
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@hooks/queries/wine/useWine', () => ({ useWine: (id?: string) => ({ data: id ? { id } : undefined }) }))
vi.mock('@hooks/queries/wine/useWineComparison', () => ({
  useWineComparison: (a?: string, b?: string) => { mocks.comparison(a, b); return { data: undefined, isFetching: false, isError: false, refetch: vi.fn() } },
}))
const wine = (id: string) => ({ id, name: `Wine ${id}` }) as WineSummary
vi.mock('@hooks/queries/wine/useWineSearch', () => ({
  useWineSearch: () => ({ data: { wines: [wine('a'), wine('c')], pagination: { hasNext: false } }, isLoading: false, isFetching: false }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.params = { wineAId: 'a' }
  mocks.search = ''
})

async function searchForSlotB() {
  const view = renderHook(useWineCompareViewModel)
  act(() => view.result.current.openSearchModal('B'))
  act(() => view.result.current.updateSearchQuery('Malbec'))
  await waitFor(() => expect(view.result.current.searchResults.length).toBeGreaterThan(0))
  return view
}

describe('comparing a wine with itself', () => {
  it('leaves the wine already in the other slot out of the results', async () => {
    const { result } = await searchForSlotB()
    expect(result.current.searchResults.map((item) => item.id)).toEqual(['c'])
  })

  it('does not select the same wine for both slots', async () => {
    const { result } = await searchForSlotB()
    act(() => result.current.selectWine(wine('a')))
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('never asks to compare a wine with itself from the URL', () => {
    mocks.search = 'compareWith=a'
    renderHook(useWineCompareViewModel)
    expect(mocks.comparison).toHaveBeenLastCalledWith('a', undefined)
  })

  it('still compares two different wines', async () => {
    const { result } = await searchForSlotB()
    act(() => result.current.selectWine(wine('c')))
    expect(mocks.navigate).toHaveBeenCalledWith('/wines/compare/a?compareWith=c', { replace: true, state: null })
    mocks.search = 'compareWith=c'
    renderHook(useWineCompareViewModel)
    expect(mocks.comparison).toHaveBeenLastCalledWith('a', 'c')
  })
})
