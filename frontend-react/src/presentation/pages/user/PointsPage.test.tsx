import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import type { PointsSummary } from '@domain/points/points.types'
import { pointsService } from '@services/points.service'
import { ProfilePointsHeader } from '@components/features/points/ProfilePointsHeader'
import { PointsPage } from './PointsPage'

const summary: PointsSummary = {
  points: 1372, tier: 'RESERVA', nextTier: 'GRAN_RESERVA', nextTierAt: 1600, tierFloor: 1000,
  todayEarned: 6, dailyCap: 40, pendingCelebration: null, showWelcome: false,
  recent: [
    { id: 'e1', source: 'REVIEW', points: 3, createdAt: new Date('2026-10-27T12:00:00Z'), label: 'Malbec Reserva' },
    { id: 'e2', source: 'EVENT_REGISTRATION', points: -4, createdAt: new Date('2026-10-26T12:00:00Z'), label: 'Harvest fest' },
    { id: 'e3', source: null, points: 1, createdAt: new Date('2026-10-25T12:00:00Z'), label: null },
  ],
}

async function mount(ui: React.ReactElement, lng: 'en-US' | 'es-AR' = 'en-US', path = '/profile/points') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/profile" element={ui} />
            <Route path="/profile/points" element={<PointsPage />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('PointsPage', () => {
  it('shows the seal and progress, how to earn points, recent movements and the full ladder', async () => {
    vi.spyOn(pointsService, 'getMyPoints').mockResolvedValue(summary)
    await mount(<p />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Your points' })).toBeInTheDocument()
    expect(screen.getByText(/^Reserve ·/)).toHaveTextContent('Reserve · 1,372 points')
    expect(screen.getByRole('progressbar', { name: 'Progress to the next seal' })).toHaveAttribute('aria-valuenow', '62')
    expect(screen.getByText('228 points to Grand Reserve')).toBeInTheDocument()
    expect(screen.getByText('Today: 6 of 40 points')).toBeInTheDocument()

    const how = screen.getByRole('heading', { name: 'How to earn points' }).closest('section')!
    const rules = within(how).getAllByRole('listitem')
    expect(rules).toHaveLength(9)
    expect(rules[0]).toHaveTextContent('Published reviewOnce per wine+3')
    expect(rules[4]).toHaveTextContent('Wine you proposed, approved for the catalogDoes not count toward the daily limit+8')
    expect(rules[7]).toHaveTextContent('Confirmed event registration')
    expect(rules[7]).toHaveTextContent('+4')
    expect(rules[8]).toHaveTextContent('Complete profilePhoto, first name, last name and phone; once only+5')
    expect(how).toHaveTextContent('You can earn up to 40 points per day')

    const recent = screen.getByRole('heading', { name: 'Recent movements' }).closest('section')!
    const moves = within(recent).getAllByRole('listitem')
    expect(moves[0]).toHaveTextContent('Review')
    expect(moves[0]).toHaveTextContent('Malbec Reserva')
    expect(moves[0]).toHaveTextContent('+3')
    expect(moves[1]).toHaveTextContent('−4')
    expect(moves[2]).toHaveTextContent('Activity')

    const ladder = screen.getByRole('heading', { name: 'The full ladder' }).closest('section')!
    const steps = within(ladder).getAllByRole('listitem')
    expect(steps).toHaveLength(11)
    expect(steps[0]).toHaveTextContent('BudFrom 0 points')
    expect(steps[10]).toHaveTextContent('VinnotFrom 5,000 points')
    expect(steps[7]).toHaveAttribute('aria-current', 'true')
    expect(steps[7]).toHaveTextContent('Your seal')
  })

  it('reads in Spanish and says when there are no movements yet', async () => {
    vi.spyOn(pointsService, 'getMyPoints').mockResolvedValue({ ...summary, recent: [], tier: 'VINNOT', nextTier: null, nextTierAt: null, points: 5200, tierFloor: 5000 })
    await mount(<p />, 'es-AR')
    expect(await screen.findByRole('heading', { level: 1, name: 'Tus puntos' })).toBeInTheDocument()
    expect(screen.getByText('Todavía no hay movimientos. La próxima reseña empieza la cuenta.')).toBeInTheDocument()
    expect(screen.getByText('Sello máximo alcanzado')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cómo se ganan puntos' })).toBeInTheDocument()
    expect(screen.getByText('Foto, nombre, apellido y teléfono; una única vez')).toBeInTheDocument()
  })

  it('offers a retry when the points cannot be loaded', async () => {
    const read = vi.spyOn(pointsService, 'getMyPoints').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(summary)
    await mount(<p />)
    fireEvent.click(await screen.findByRole('button', { name: /retry|try again/i }))
    expect(await screen.findByText('228 points to Grand Reserve')).toBeInTheDocument()
    expect(read).toHaveBeenCalledTimes(2)
  })
})

describe('ProfilePointsHeader', () => {
  it('shows points and the seal in the profile header; the seal opens the points page', async () => {
    vi.spyOn(pointsService, 'getMyPoints').mockResolvedValue(summary)
    await mount(<ProfilePointsHeader summary={summary} />, 'en-US', '/profile')
    const open = screen.getByRole('link', { name: 'Open your points: Reserve, 1,372 points' })
    expect(open.querySelector('.vinnot-seal')).not.toHaveClass('is-list')
    expect(screen.getByText('228 points to Grand Reserve')).toBeInTheDocument()
    fireEvent.click(open)
    expect(await screen.findByRole('heading', { level: 1, name: 'Your points' })).toBeInTheDocument()
  })

  it('shows a placeholder while loading and nothing when the points are unavailable', async () => {
    const view = await mount(<ProfilePointsHeader summary={undefined} loading />, 'en-US', '/profile')
    expect(screen.getByTestId('profile-points-loading')).toBeInTheDocument()
    view.unmount()
    const empty = await mount(<ProfilePointsHeader summary={undefined} />, 'en-US', '/profile')
    expect(empty.container).toBeEmptyDOMElement()
  })
})
