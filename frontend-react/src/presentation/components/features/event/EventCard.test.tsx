import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { expect, it } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import type { Event } from '@domain/event/event.types'
import { formatPrice } from '@utils/format'
import { EventCard } from './EventCard'

const start = new Date(2030, 2, 14, 19, 30)

function event(overrides: Partial<Event> = {}): Event {
  return {
    id: 'e1',
    title: 'Cata de otoño',
    type: 'TASTING',
    startDate: start,
    endDate: start,
    location: { name: 'Bodega', address: '', city: 'Mendoza', region: 'Mendoza', country: 'AR', latitude: null, longitude: null },
    imageUrl: null,
    price: 1500,
    maxAttendees: 20,
    currentAttendees: 5,
    registration: { currency: 'USD' },
    ...overrides,
  } as unknown as Event
}

async function mount(item: Event, lng: 'en-US' | 'es-AR') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  return render(<I18nextProvider i18n={i18n}><MemoryRouter><EventCard event={item} index={0} /></MemoryRouter></I18nextProvider>)
}

it('shows the price in the event currency and the app language, and the month in that language', async () => {
  await mount(event(), 'en-US')
  expect(screen.getByText('$1,500')).toBeInTheDocument()
  expect(screen.getByText(start.toLocaleDateString('en-US', { month: 'short' }))).toBeInTheDocument()
  expect(screen.getByRole('link')).toHaveAttribute('href', '/events/e1')
})

it('formats the price for Spanish (Argentina) and shows free events as free', async () => {
  const view = await mount(event({ registration: { currency: 'ARS' } as Event['registration'] }), 'es-AR')
  expect(screen.getByText(/1\.500/).textContent).toBe(formatPrice(1500, 'ARS', 'es-AR'))
  expect(screen.getByText(start.toLocaleDateString('es-AR', { month: 'short' }))).toBeInTheDocument()
  view.unmount()
  await mount(event({ price: 0 }), 'es-AR')
  expect(screen.getByText(es.events.free)).toBeInTheDocument()
})

it('shows the cover in the same 16:9 frame the cover was adjusted in', async () => {
  const view = await mount(event(), 'en-US')
  expect(view.container.querySelector('.aspect-video')).not.toBeNull()
  expect(view.container.querySelector('[class*="aspect-[16/10]"]')).toBeNull()
})

it('zooms the cover on hover and fills the capacity bar over time, except under reduced motion', async () => {
  await mount(event({ imageUrl: 'https://cdn.example/event.jpg' }), 'en-US')
  expect(screen.getByRole('link').querySelector('img.object-cover')).toHaveClass('transition-transform', 'duration-500', 'group-hover:scale-105', 'motion-reduce:transition-none', 'motion-reduce:group-hover:scale-100')
  expect(document.querySelector('[style*="width"]')).toHaveClass('transition-all', 'duration-500', 'motion-reduce:transition-none')
})
