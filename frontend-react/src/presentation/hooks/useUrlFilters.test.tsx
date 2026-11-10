import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { expect, it } from 'vitest'
import { useUrlFilters } from './useUrlFilters'

function setup(initial: string) {
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  return renderHook(() => ({ filters: useUrlFilters(['search', 'country'] as const), location: useLocation() }), { wrapper })
}

it('reads filters and page from the URL', () => {
  const { result } = setup('/events?search=malbec&country=Argentina&page=2')
  expect(result.current.filters.values).toEqual({ search: 'malbec', country: 'Argentina' })
  expect(result.current.filters.page).toBe(2)
})

it.each(['-1', 'abc', '1.5'])('treats an invalid page %s as the first page', (page) => {
  expect(setup(`/events?page=${page}`).result.current.filters.page).toBe(0)
})

it('writes a filter, drops empty values and returns to the first page', () => {
  const { result } = setup('/events?country=Argentina&page=3')
  act(() => result.current.filters.update({ search: 'tasting', country: '' }))
  expect(result.current.location.search).toBe('?search=tasting')
  expect(result.current.filters.page).toBe(0)
})

it('changes only the page when the page is passed', () => {
  const { result } = setup('/events?search=tasting')
  act(() => result.current.filters.update({ page: 4 }))
  expect(result.current.location.search).toBe('?search=tasting&page=4')
  act(() => result.current.filters.update({ page: 0 }))
  expect(result.current.location.search).toBe('?search=tasting')
})
