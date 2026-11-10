import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { expect, it } from 'vitest'
import es from '@i18n/locales/es-AR.json'
import { PUBLISHED_APP_LISTINGS } from '@/shared/config/appDownloads'
import { WineScanPage } from './WineScanPage'

it('links the official App Store and Google Play badges to the published apps', async () => {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'es-AR', resources: { 'es-AR': { translation: es } } })
  render(<I18nextProvider i18n={i18n}><MemoryRouter><WineScanPage /></MemoryRouter></I18nextProvider>)

  const appStore = screen.getByRole('link', { name: `${es.scan.mobile.downloadOn} ${es.scan.mobile.appStore}` })
  expect(appStore).toHaveAttribute('href', PUBLISHED_APP_LISTINGS.ios)
  expect(appStore.querySelector('img')).toHaveAttribute('src', '/share-assets/app-store.svg')
  const googlePlay = screen.getByRole('link', { name: `${es.scan.mobile.availableOn} ${es.scan.mobile.googlePlay}` })
  expect(googlePlay).toHaveAttribute('href', PUBLISHED_APP_LISTINGS.android)
  expect(googlePlay.querySelector('img')).toHaveAttribute('src', '/share-assets/google-play.png')
  for (const link of [appStore, googlePlay]) {
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
  expect(screen.queryByText(es.scan.mobile.missingLinkAction)).toBeNull()
})
