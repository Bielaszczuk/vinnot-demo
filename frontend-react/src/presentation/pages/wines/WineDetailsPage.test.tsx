import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { beforeEach, expect, it, vi } from 'vitest'
import es from '@i18n/locales/es-AR.json'
import { WineDetailsPage } from './WineDetailsPage'

const vm = vi.hoisted(() => ({ current: {} as Record<string, unknown>, reviewsProps: {} as Record<string, unknown> }))
vi.mock('./useWineDetailsViewModel', () => ({ useWineDetailsViewModel: () => vm.current }))
vi.mock('@components/features/wine', () => ({
  ReviewsList: (props: Record<string, unknown>) => { vm.reviewsProps = props; return null },
  WineTasteProfile: () => null,
}))

async function mount(overrides: Record<string, unknown>) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'es-AR', resources: { 'es-AR': { translation: es } } })
  vm.current = { t: i18n.t, isLoading: false, loadFailed: false, loadError: null, retry: vi.fn(), wine: undefined, ...overrides }
  render(<I18nextProvider i18n={i18n}><MemoryRouter><WineDetailsPage /></MemoryRouter></I18nextProvider>)
}

beforeEach(() => vi.clearAllMocks())

it('shows a retry instead of "not found" when the wine could not load', async () => {
  const retry = vi.fn()
  await mount({ loadFailed: true, loadError: { status: 0, code: 'NETWORK_ERROR' }, retry })
  expect(screen.queryByText(es.wineDetails.notFound)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: es.common.retry }))
  expect(retry).toHaveBeenCalledOnce()
})

it('counts a single rating in the singular', async () => {
  await mount({
    wine: { id: 'w1', name: 'Reserva', type: 'RED', winery: 'Bodega', grapeVarieties: [], rating: 4, reviewCount: 1 },
  })
  expect(screen.getByText('1 valoración')).toBeInTheDocument()
  expect(screen.queryByText(/1 valoraciones/)).toBeNull()
})

it('keeps the not-found state with a link to the catalogue for a missing wine', async () => {
  await mount({})
  expect(screen.getByText(es.wineDetails.notFound)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: es.wineDetails.browseCatalog })).toHaveAttribute('href', '/wines')
  expect(screen.queryByRole('button', { name: es.common.retry })).toBeNull()
})

const wine = { id: 'w1', name: 'Reserva', type: 'RED', winery: 'Bodega', grapeVarieties: [], reviewCount: 0 }

it('keeps Share, Compare and Add to Cellar working beside the review shortcut', async () => {
  const shareWine = vi.fn()
  const setShowCellarModal = vi.fn()
  await mount({ wine, id: 'w1', isAuthenticated: true, isInCellar: false, shareWine, setShowCellarModal, openReviews: vi.fn() })
  fireEvent.click(screen.getByRole('button', { name: es.common.share }))
  expect(shareWine).toHaveBeenCalledOnce()
  expect(screen.getByRole('link', { name: es.wines.compare })).toHaveAttribute('href', '/wines/compare/w1')
  fireEvent.click(screen.getByRole('button', { name: es.wineDetails.addToCellar }))
  expect(setShowCellarModal).toHaveBeenCalledWith(true)
})

it('offers to write a review from the hero and hands the request to the reviews card', async () => {
  const openReviews = vi.fn()
  const reviewsSectionRef = { current: null }
  await mount({ wine, id: 'w1', isAuthenticated: true, openReviews, reviewsSectionRef, reviewRequest: 2, pinOwnReview: false, focusOwnReview: false })
  fireEvent.click(screen.getByRole('button', { name: es.reviews.writeReview }))
  expect(openReviews).toHaveBeenCalledOnce()
  expect(reviewsSectionRef.current).toBeInstanceOf(HTMLDivElement)
  expect(vm.reviewsProps).toMatchObject({ wineId: 'w1', writeRequest: 2, pinOwnReview: false })
})

it('names the shortcut after the reader\'s own review', async () => {
  await mount({ wine, id: 'w1', isAuthenticated: true, hasOwnReview: true, openReviews: vi.fn(), pinOwnReview: true })
  expect(screen.getByRole('button', { name: es.reviews.yourReview })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: es.reviews.writeReview })).toBeNull()
  expect(vm.reviewsProps).toMatchObject({ pinOwnReview: true })
})

it('keeps the review shortcut for signed-out visitors, who are sent to log in', async () => {
  const openReviews = vi.fn()
  await mount({ wine, id: 'w1', isAuthenticated: false, openReviews })
  expect(screen.queryByRole('button', { name: es.wineDetails.addToCellar })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: es.reviews.writeReview }))
  expect(openReviews).toHaveBeenCalledOnce()
})

it('starts the AI profile generation with one click when the wine has no profile yet', async () => {
  await mount({ wine, id: 'w1', aiProfileExists: false })
  expect(screen.getByRole('link', { name: es.wineDetails.generateProfile }))
    .toHaveAttribute('href', '/wines/w1/ai-profile?generate=1')
})

it('opens the existing AI profile without generating it again', async () => {
  await mount({ wine, id: 'w1', aiProfileExists: true })
  expect(screen.getByRole('link', { name: es.wineDetails.viewProfile }))
    .toHaveAttribute('href', '/wines/w1/ai-profile')
})
