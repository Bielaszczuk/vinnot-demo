import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import type { PointsSummary } from '@domain/points/points.types'
import { pointsService } from '@services/points.service'
import { queryKeys } from '@hooks/queries/queryKeys'
import { PointsCelebrationHost } from './PointsCelebrationHost'

const auth = vi.hoisted(() => ({ isAuthenticated: true }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => auth }))

const base: PointsSummary = {
  points: 1010, tier: 'RESERVA', nextTier: 'GRAN_RESERVA', nextTierAt: 1600, tierFloor: 1000,
  todayEarned: 3, dailyCap: 40, pendingCelebration: null, showWelcome: false, recent: [],
}

async function mount(client: QueryClient) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'en-US', resources: { 'en-US': { translation: en } } })
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/wines']}>
          <Routes>
            <Route path="/wines" element={<PointsCelebrationHost />} />
            <Route path="/profile/points" element={<p>points page</p>} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

beforeEach(() => {
  auth.isAuthenticated = true
  vi.spyOn(pointsService, 'markCelebrated').mockResolvedValue()
  vi.spyOn(pointsService, 'dismissWelcome').mockResolvedValue()
})
afterEach(() => vi.restoreAllMocks())

describe('PointsCelebrationHost', () => {
  it('reveals a newly reached tier once and records it as celebrated', async () => {
    const getMyPoints = vi.spyOn(pointsService, 'getMyPoints')
      .mockResolvedValueOnce({ ...base, pendingCelebration: 'RESERVA' })
      // The record failed: the next read still reports the tier as pending.
      .mockResolvedValue({ ...base, pendingCelebration: 'RESERVA' })
    const cache = client()
    await mount(cache)
    const dialog = await screen.findByRole('dialog', { name: 'You reached Reserve' })
    expect(dialog).toHaveTextContent('Your activity earned the Reserve seal.')
    expect(screen.getByRole('img', { name: 'Reserve seal' })).not.toHaveClass('is-list')
    await waitFor(() => expect(pointsService.markCelebrated).toHaveBeenCalledWith('RESERVA'))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    await act(async () => { await cache.invalidateQueries({ queryKey: queryKeys.users.myPoints() }) })
    expect(getMyPoints.mock.calls.length).toBeGreaterThan(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(pointsService.markCelebrated).toHaveBeenCalledTimes(1)
  })

  it('shows the one-time welcome card and opens the points page from it', async () => {
    vi.spyOn(pointsService, 'getMyPoints').mockResolvedValue({ ...base, showWelcome: true })
    await mount(client())
    const dialog = await screen.findByRole('dialog', { name: 'Your seal is ready' })
    expect(dialog).toHaveTextContent('you have 1,010 points and the Reserve seal')
    await waitFor(() => expect(pointsService.dismissWelcome).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'See my points' }))
    expect(await screen.findByText('points page')).toBeInTheDocument()
  })

  it('stays silent with nothing to celebrate and for visitors', async () => {
    const getMyPoints = vi.spyOn(pointsService, 'getMyPoints').mockResolvedValue(base)
    const view = await mount(client())
    await waitFor(() => expect(getMyPoints).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).toBeNull()
    view.unmount()
    getMyPoints.mockClear()
    auth.isAuthenticated = false
    await mount(client())
    expect(getMyPoints).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
