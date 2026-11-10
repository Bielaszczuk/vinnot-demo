import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { beforeEach, expect, it, vi } from 'vitest'
import es from '@i18n/locales/es-AR.json'
import { illustrations } from '@shared/illustrations'
import { WineryDetailsPage } from './WineryDetailsPage'

const vm = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('./useWineryDetailsViewModel', () => ({ useWineryDetailsViewModel: () => vm.current }))

async function mount(overrides: Record<string, unknown>) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'es-AR', resources: { 'es-AR': { translation: es } } })
  vm.current = {
    t: i18n.t, isLoading: false, loadFailed: false, loadError: null, retry: vi.fn(), loadingWines: false,
    wines: [], displayWinery: null, goBack: vi.fn(), ...overrides,
  }
  render(<I18nextProvider i18n={i18n}><MemoryRouter><WineryDetailsPage /></MemoryRouter></I18nextProvider>)
}

beforeEach(() => vi.clearAllMocks())

it('shows a retry instead of "not found" when the winery could not load', async () => {
  const retry = vi.fn()
  await mount({ loadFailed: true, loadError: { status: 500, code: 'INTERNAL_ERROR' }, retry })
  expect(screen.queryByText(es.wineries.notFound)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: es.common.retry }))
  expect(retry).toHaveBeenCalledOnce()
})

it('keeps the not-found state with a link to the catalogue for a missing winery', async () => {
  await mount({})
  expect(screen.getByText(es.wineries.notFound)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: es.wineDetails.browseCatalog })).toHaveAttribute('href', '/wines')
})

it('shows the page loader while the winery loads', async () => {
  await mount({ isLoading: true })
  expect(screen.getByRole('status', { name: es.common.loading })).toBeInTheDocument()
})

it('shows the winery watercolor when the winery has no wines yet', async () => {
  await mount({ displayWinery: { name: 'Bodega Norte', address: null, logoUrl: null }, hasContactInfo: false })
  expect(screen.getByRole('heading', { level: 1, name: 'Bodega Norte' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: es.wineries.noWines })).toBeInTheDocument()
  expect(document.querySelectorAll(`img[src="${illustrations.winery}"][alt=""]`)).toHaveLength(2)
})
