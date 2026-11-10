import { fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { CookieSettingsPage } from './CookieSettingsPage'
import { LegalCentrePage } from './LegalCentrePage'

const maps = vi.hoisted(() => ({ allowed: false, setAllowed: vi.fn(), saved: undefined as boolean | undefined }))
vi.mock('@/presentation/hooks/useExternalMapsPreference', () => ({ useExternalMapsPreference: () => maps }))

async function mount(ui: React.ReactElement, lng: 'en-US' | 'es-AR') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  return render(<I18nextProvider i18n={i18n}><MemoryRouter>{ui}</MemoryRouter></I18nextProvider>)
}

it('shows the cookie settings in English from the locale files, under the page banner', async () => {
  maps.saved = false
  await mount(<CookieSettingsPage />, 'en-US')
  expect(screen.getByRole('heading', { level: 1, name: en.cookieSettings.title })).toBeInTheDocument()
  expect(screen.getByText(en.cookieSettings.summary)).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: en.cookieSettings.mapsTitle })).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent(en.cookieSettings.sessionOnly)
  fireEvent.click(screen.getByRole('checkbox', { name: en.cookieSettings.mapsToggle }))
  expect(maps.setAllowed).toHaveBeenCalledWith(true)
  expect(screen.getByRole('link', { name: en.cookieSettings.askPrivacy })).toHaveAttribute('href', '/contact')
})

it('confirms a saved cookie preference in Spanish', async () => {
  maps.saved = true
  await mount(<CookieSettingsPage />, 'es-AR')
  expect(screen.getByRole('heading', { level: 1, name: es.cookieSettings.title })).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent(es.cookieSettings.saved)
})

it('shows the legal centre categories and links in English from the locale files', async () => {
  await mount(<LegalCentrePage />, 'en-US')
  expect(screen.getByRole('heading', { level: 1, name: en.legalCentre.title })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: en.legalCentre.categories.privacy })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: en.legalCentre.helpLink })).toHaveAttribute('href', '/help')
})

it('shows the legal centre in Spanish', async () => {
  await mount(<LegalCentrePage />, 'es-AR')
  expect(screen.getByRole('heading', { level: 2, name: es.legalCentre.operatorTitle })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: es.legalCentre.contactLink })).toHaveAttribute('href', '/contact')
})
