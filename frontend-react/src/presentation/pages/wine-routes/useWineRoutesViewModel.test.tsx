import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWineRoutesViewModel } from './useWineRoutesViewModel'
import { useWineRoutes } from '@hooks/queries/wineRoute/useWineRoutes'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@hooks/useDebounce', () => ({ useDebounce: (value: string) => value }))
const motion = vi.hoisted(() => ({ reduced: false }))
vi.mock('@hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }))
vi.mock('@hooks/queries/wineRoute/useWineRoutes', () => ({ useWineRoutes: vi.fn() }))
vi.mock('@hooks/queries/wine/useCountries', () => ({ useCountries: () => ({ data: [{ id: 'ar', name: 'Argentina' }] }) }))
vi.mock('@hooks/queries/wine/useRegions', () => ({ useRegions: () => ({ data: [{ id: 'mza', name: 'Mendoza', countryId: 'ar' }] }) }))

const serverPage = {
  routes: [{ id: 'r1', name: 'Uco', difficulty: 'short' }],
  pagination: { totalItems: 41, totalPages: 3, pageNumber: 1 },
}

beforeEach(() => {
  window.scrollTo = vi.fn() as never
  vi.mocked(useWineRoutes).mockReturnValue({
    data: serverPage, isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useWineRoutes>)
})

function setup(initial = '/wine-routes') {
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  return renderHook(() => ({ vm: useWineRoutesViewModel(), location: useLocation() }), { wrapper })
}

it('asks the API for search, country, region and difficulty instead of filtering the page in the browser', () => {
  const { result } = setup('/wine-routes?search=uco&difficulty=long&country=Argentina&region=Mendoza&page=1')
  expect(useWineRoutes).toHaveBeenLastCalledWith(
    { search: 'uco', difficulty: 'long', country: 'Argentina', region: 'Mendoza' }, 1, 20,
  )
  // The server already filtered: the page is shown as returned, so count and pages match the list.
  expect(result.current.vm.routes).toEqual(serverPage.routes)
  expect(result.current.vm.totalItems).toBe(41)
  expect(result.current.vm.totalPages).toBe(3)
})

it('requests the plain list without filters', () => {
  setup()
  expect(useWineRoutes).toHaveBeenLastCalledWith(undefined, 0, 20)
})

it('keeps filters and page in the URL so they survive Back', () => {
  const { result } = setup('/wine-routes?page=2')
  act(() => result.current.vm.handleCountryChange('Argentina'))
  act(() => result.current.vm.handleRegionChange('Mendoza'))
  act(() => result.current.vm.handleDifficultyChange('medium'))
  act(() => result.current.vm.handleSearchChange('valle'))
  act(() => result.current.vm.goToPage(1))
  expect(new URLSearchParams(result.current.location.search).toString())
    .toBe('country=Argentina&region=Mendoza&difficulty=medium&search=valle&page=1')
  expect(result.current.vm.regionOptions).toEqual([{ value: 'Mendoza', label: 'Mendoza' }])
  act(() => result.current.vm.handleCountryChange('Chile'))
  expect(result.current.location.search).toBe('?country=Chile&difficulty=medium&search=valle')
  act(() => result.current.vm.clearFilters())
  expect(result.current.location.search).toBe('')
  expect(result.current.vm.hasActiveFilters).toBe(false)
})

it('ignores an unknown difficulty in the URL', () => {
  const { result } = setup('/wine-routes?difficulty=extreme')
  expect(result.current.vm.selectedDifficulty).toBeNull()
  expect(useWineRoutes).toHaveBeenLastCalledWith(undefined, 0, 20)
})

describe('page change scroll', () => {
  beforeEach(() => { motion.reduced = false })

  it('scrolls smoothly to the top when motion is allowed', () => {
    const { result } = setup()
    act(() => result.current.vm.goToPage(1))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('jumps to the top without smooth scrolling under reduced motion', () => {
    motion.reduced = true
    const { result } = setup()
    act(() => result.current.vm.goToPage(1))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })
})
