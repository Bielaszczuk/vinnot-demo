import { render, screen, within } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import es from '@i18n/locales/es-AR.json'
import { WineRouteDetailsPage } from './WineRouteDetailsPage'
import { useWineRouteDetailsViewModel } from './useWineRouteDetailsViewModel'

vi.mock('./useWineRouteDetailsViewModel', () => ({ useWineRouteDetailsViewModel: vi.fn() }))
vi.mock('@components/features/community/CommunityActions', () => ({
  CommunityActions: ({ variant }: { variant?: string }) => <button type="button">actions-{variant ?? 'links'}</button>,
}))
vi.mock('@components/features/wineRoute/RouteStopTimeline', () => ({ RouteStopTimeline: () => null }))
vi.mock('@components/features/wineRoute/RouteInfoSidebar', () => ({ RouteInfoSidebar: () => null }))

const i18n = createInstance()
await i18n.use(initReactI18next).init({ lng: 'es-AR', resources: { 'es-AR': { translation: es } } })

function mount(overrides: Record<string, unknown>) {
  vi.mocked(useWineRouteDetailsViewModel).mockReturnValue({
    t: i18n.t.bind(i18n),
    wineRoute: null,
    isLoading: false,
    isError: false,
    error: null,
    retry: vi.fn(),
    totalDurationMinutes: 90,
    totalDistanceKm: 12,
    routeMapQuery: null,
    diffConf: null,
    goBack: vi.fn(),
    startNavigation: vi.fn(),
    shareRoute: vi.fn(),
    canShare: true,
    ...overrides,
  } as unknown as ReturnType<typeof useWineRouteDetailsViewModel>)
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <WineRouteDetailsPage />
      </MemoryRouter>
    </I18nextProvider>,
  )
}

const route = {
  id: 'r1', name: 'Valle de Uco', region: 'Mendoza', country: 'Argentina', stops: [], tags: [], rating: 4.5,
  reviewCount: 8, difficulty: 'short', days: null, imageUrl: null, description: '',
}

it('puts the community menu next to the share actions of the route', () => {
  mount({ wineRoute: route })
  const title = screen.getByRole('heading', { level: 1, name: 'Valle de Uco' })
  const card = title.closest('section')!
  expect(within(card).getByRole('button', { name: 'actions-menu' })).toBeInTheDocument()
  expect(within(card).getByRole('button', { name: new RegExp(es.events.share) })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: '4,5 de 5 estrellas' })).toBeInTheDocument()
})

it('shows the page loader while the route loads', () => {
  mount({ isLoading: true })
  expect(screen.getByRole('status', { name: es.common.loading })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /actions/ })).toBeNull()
})

it('offers the routes list when the route does not exist', () => {
  mount({})
  expect(screen.getByRole('heading', { name: es.routes.notFound })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: es.routes.explore })).toHaveAttribute('href', '/wine-routes')
})
