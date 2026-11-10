import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { winesService } from '@services/wines.service'
import { queryKeys } from '@hooks/queries/queryKeys'
import { useWineComparison } from '@hooks/queries/wine/useWineComparison'
import type { PropsWithChildren } from 'react'
import type { WineComparison } from '@domain/wine/wine.types'
import { WineComparePage } from './WineComparePage'

vi.mock('@services/wines.service', () => ({ winesService: { compareWines: vi.fn() } }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }) }))
vi.mock('@hooks/queries/wine/useWine', () => ({ useWine: (id: string) => ({ data: { id, name: `Wine ${id}`, grapeVarieties: [], winery: 'Winery' } }) }))
vi.mock('@hooks/queries/wine/useWineSearch', () => ({ useWineSearch: () => ({}) }))
vi.mock('@components/features/wine', () => ({ CompareLoadingSteps: () => <div role="status">comparing</div> }))

afterEach(() => { vi.resetAllMocks(); focusManager.setFocused(undefined); onlineManager.setOnline(true) })

describe('comparison recovery with selections preserved', () => {
  it('does not retry a cached failure when the view remounts', async () => {
    vi.mocked(winesService.compareWines).mockRejectedValue(new Error('offline'))
    const client = new QueryClient()
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const first = renderHook(() => useWineComparison('a', 'b'), { wrapper })
    await waitFor(() => expect(first.result.current.isError).toBe(true))
    first.unmount()
    const second = renderHook(() => useWineComparison('a', 'b'), { wrapper })
    expect(second.result.current.isError).toBe(true)
    expect(second.result.current.isFetching).toBe(false)
    expect(winesService.compareWines).toHaveBeenCalledTimes(1)
    second.unmount()
    client.clear()
  })

  it('shows an error, retries deliberately, and does not compare on focus, reconnect or catalog invalidation', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    let resolve!: (value: WineComparison) => void
    vi.mocked(winesService.compareWines).mockRejectedValueOnce(new Error('offline'))
      .mockReturnValueOnce(new Promise((res) => { resolve = res }))
    const client = new QueryClient()
    const { unmount } = render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/wines/compare/a?compareWith=b']}>
          <Routes><Route path="/wines/compare/:wineAId" element={<WineComparePage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    try {
      expect(await screen.findByRole('alert')).toHaveTextContent('compare.loadError')
      expect(screen.getByText('Wine a')).toBeInTheDocument()
      expect(screen.getByText('Wine b')).toBeInTheDocument()
      await act(async () => {
        focusManager.setFocused(false); focusManager.setFocused(true)
        onlineManager.setOnline(false); onlineManager.setOnline(true)
        await client.invalidateQueries({ queryKey: queryKeys.wines.all })
      })
      expect(winesService.compareWines).toHaveBeenCalledTimes(1)
      fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
      await waitFor(() => expect(winesService.compareWines).toHaveBeenCalledTimes(2))
      expect(screen.queryByRole('button', { name: 'common.retry' })).not.toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('comparing')
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
      await act(async () => { resolve({ summary: 'Recovered comparison' } as WineComparison) })
      expect(await screen.findByText('Recovered comparison')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(winesService.compareWines).toHaveBeenLastCalledWith('a', 'b', 'es')
    } finally { unmount(); client.clear() }
  })
})
