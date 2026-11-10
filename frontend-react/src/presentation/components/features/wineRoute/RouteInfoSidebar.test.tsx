import { render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { expect, it } from 'vitest'
import es from '@i18n/locales/es-AR.json'
import type { WineRoute } from '@domain/route/route.types'
import { RouteInfoSidebar } from './RouteInfoSidebar'

it('scrolls the route card with the page so it never covers Quick info and Stops', async () => {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'es-AR', resources: { 'es-AR': { translation: es } } })
  const route = {
    id: 'r1', name: 'Ruta del Malbec', difficulty: 'short', stops: [
      { id: 's1', name: 'Bodega Uno', type: 'WINERY', location: { latitude: -33, longitude: -68 } },
      { id: 's2', name: 'Bodega Dos', type: 'WINERY', location: { latitude: -33.1, longitude: -68.1 } },
    ],
  } as unknown as WineRoute
  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <RouteInfoSidebar route={route} totalDurationMinutes={120} totalDistanceKm={40} />
    </I18nextProvider>,
  )
  expect(screen.getAllByText('Bodega Uno').length).toBeGreaterThan(0)
  expect(container.querySelector('[class*="sticky"]')).toBeNull()
})
