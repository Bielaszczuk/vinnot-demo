import { fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import es from '@i18n/locales/es-AR.json'
import { illustrations } from '@shared/illustrations'
import { WineRoutesPage } from './WineRoutesPage'
import { useWineRoutesViewModel } from './useWineRoutesViewModel'

vi.mock('./useWineRoutesViewModel', () => ({ useWineRoutesViewModel: vi.fn() }))
vi.mock('@components/features/wineRoute/WineRouteCard', () => ({
  WineRouteCard: ({ route }: { route: { name: string } }) => <article>{route.name}</article>,
}))

const i18n = createInstance()
await i18n.use(initReactI18next).init({ lng: 'es-AR', resources: { 'es-AR': { translation: es } } })

const clearFilters = vi.fn()
const goToPage = vi.fn()
const handleDifficultyChange = vi.fn()

function viewModel(overrides: Partial<ReturnType<typeof useWineRoutesViewModel>> = {}) {
  return {
    t: i18n.t.bind(i18n),
    search: '',
    selectedDifficulty: null,
    selectedCountry: null,
    selectedRegion: null,
    currentPage: 0,
    routes: [],
    isLoading: false,
    isError: false,
    error: null,
    retry: vi.fn(),
    totalItems: 0,
    totalPages: 1,
    isFirstPage: true,
    isLastPage: true,
    countryOptions: [{ value: 'Argentina', label: 'Argentina' }],
    regionOptions: [{ value: 'Mendoza', label: 'Mendoza' }],
    hasActiveFilters: false,
    clearFilters,
    handleSearchChange: vi.fn(),
    handleDifficultyChange,
    handleCountryChange: vi.fn(),
    handleRegionChange: vi.fn(),
    goToPage,
    ...overrides,
  } as unknown as ReturnType<typeof useWineRoutesViewModel>
}

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <WineRoutesPage />
      </MemoryRouter>
    </I18nextProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

it('offers to clear the filters when the filtered list is empty, with the route watercolor', () => {
  vi.mocked(useWineRoutesViewModel).mockReturnValue(viewModel({ hasActiveFilters: true, search: 'uco' }))
  renderPage()
  expect(screen.getByRole('heading', { level: 1, name: es.routes.title })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: es.common.noResults })).toBeInTheDocument()
  expect(document.querySelector(`img[src="${illustrations.route}"]`)).not.toBeNull()
  const clear = screen.getAllByRole('button', { name: es.routes.clearFilters })
  expect(clear).toHaveLength(2)
  fireEvent.click(clear[1]!)
  expect(clearFilters).toHaveBeenCalledTimes(1)
})

it('invites a route search, not a wine search', () => {
  vi.mocked(useWineRoutesViewModel).mockReturnValue(viewModel())
  renderPage()
  expect(screen.getByPlaceholderText(es.routes.searchPlaceholder)).toBeInTheDocument()
  expect(screen.queryByPlaceholderText(es.wines.searchPlaceholder)).toBeNull()
})

it('shows the empty catalog without a clear action when no filter is active', () => {
  vi.mocked(useWineRoutesViewModel).mockReturnValue(viewModel())
  renderPage()
  expect(screen.getByRole('heading', { name: es.routes.noRoutes })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: es.routes.clearFilters })).toBeNull()
  expect(screen.queryByRole('navigation', { name: es.common.pagination.label })).toBeNull()
})

it('filters with labelled selects on the title band and pages through results', () => {
  vi.mocked(useWineRoutesViewModel).mockReturnValue(viewModel({
    routes: [{ id: 'r1', name: 'Valle de Uco' }] as never,
    totalItems: 41,
    totalPages: 3,
    selectedCountry: 'Argentina',
  }))
  renderPage()
  expect(screen.getByText('Valle de Uco')).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: es.wines.region })).toBeInTheDocument()
  fireEvent.change(screen.getByRole('combobox', { name: es.routes.duration.label }), { target: { value: 'long' } })
  expect(handleDifficultyChange).toHaveBeenCalledWith('long')
  fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }))
  expect(goToPage).toHaveBeenCalledWith(1)
})

it('shows the page loader while routes load', () => {
  vi.mocked(useWineRoutesViewModel).mockReturnValue(viewModel({ isLoading: true }))
  renderPage()
  expect(screen.getByRole('status', { name: es.common.loading })).toBeInTheDocument()
})
