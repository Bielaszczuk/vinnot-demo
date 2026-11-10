import { fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import es from '@i18n/locales/es-AR.json'
import type { RouteStop } from '@domain/route/route.types'
import { RouteStopTimeline } from './RouteStopTimeline'

const stops = [
  { id: 's1', name: 'Bodega Alta', type: 'winery', duration: 60, description: 'Cata guiada',
    location: { latitude: null, longitude: null, address: 'Ruta 40', city: 'Tupungato' },
    winery: { id: 'w1', name: 'Bodega Alta', phone: '+54 261', email: null, website: null } },
  { id: 's2', name: 'Cerro', type: 'viewpoint', duration: 0, location: { latitude: null, longitude: null, address: null, city: null } },
] as unknown as RouteStop[]

it('expands a stop from an accessible toggle and shows its translated type and contact', async () => {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'es-AR', resources: { 'es-AR': { translation: es } } })
  render(<I18nextProvider i18n={i18n}><MemoryRouter><RouteStopTimeline stops={stops} /></MemoryRouter></I18nextProvider>)
  expect(screen.getByText(es.routes.stopTypes.viewpoint)).toBeInTheDocument()
  const toggle = screen.getByRole('button', { name: /Bodega Alta/ })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('Cata guiada')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Bodega Alta' })).toHaveAttribute('href', '/wineries/w1')
  expect(screen.getByText(es.routes.contact)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '+54 261' })).toHaveAttribute('href', 'tel:+54 261')
  expect(screen.getByRole('button', { name: es.events.openMaps })).toBeInTheDocument()
})
