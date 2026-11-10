import { render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import es from '@i18n/locales/es-AR.json'
import { MyCellarPage } from './MyCellarPage'
import { useMyCellarViewModel } from './useMyCellarViewModel'

vi.mock('./useMyCellarViewModel', () => ({ useMyCellarViewModel: vi.fn() }))

const i18n = createInstance()
await i18n.use(initReactI18next).init({ lng: 'es-AR', resources: { 'es-AR': { translation: es } } })

function mount(overrides: Record<string, unknown>) {
  vi.mocked(useMyCellarViewModel).mockReturnValue({
    cellarWines: [], isLoading: false, isError: false, error: null, retry: vi.fn(), editingEntry: null, publishingEntry: null,
    handlePublishReview: vi.fn(), closeReviewModal: vi.fn(), totalWines: 0, averageRating: 0, averageRatingLabel: '—',
    regionCount: 0, typeMix: [], handleEdit: vi.fn(), closeEditModal: vi.fn(), handleDelete: vi.fn(), ...overrides,
  } as unknown as ReturnType<typeof useMyCellarViewModel>)
  return render(<I18nextProvider i18n={i18n}><MemoryRouter><MyCellarPage /></MemoryRouter></I18nextProvider>)
}

it('invites to add the first wine from an empty cellar with links, not buttons inside links', () => {
  mount({})
  expect(screen.getByRole('heading', { level: 1, name: es.cellar.title })).toBeInTheDocument()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  const links = screen.getAllByRole('link', { name: es.cellar.addWine })
  expect(links).toHaveLength(2)
  links.forEach((link) => {
    expect(link).toHaveAttribute('href', '/wines')
    expect(link.querySelector('button')).toBeNull()
  })
})

it('shows the app cover stats (wines, average, regions, type mix) and no money invested', () => {
  mount({ totalWines: 3, averageRating: 4.5, averageRatingLabel: '4,5', regionCount: 2,
    typeMix: [{ type: 'RED', count: 2 }, { type: 'WHITE', count: 1 }], cellarWines: [] })
  expect(screen.getByTestId('cellar-cover-illustration')).toBeInTheDocument()
  expect(screen.getByText('4,5')).toBeInTheDocument()
  expect(screen.getByText(es.cellar.stats.regions)).toBeInTheDocument()
  expect(screen.getByRole('img', { name: `${es.cellar.stats.typeMix}: Tinto 2, Blanco 1` })).toBeInTheDocument()
  expect(screen.queryByText('Invertido')).toBeNull()
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
})

it('shows the page loader while the cellar loads', () => {
  mount({ isLoading: true })
  expect(screen.getByRole('status', { name: es.common.loading })).toBeInTheDocument()
})
