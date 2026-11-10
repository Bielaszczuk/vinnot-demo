import { fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { illustrations } from '@shared/illustrations'
import type { WineSummary } from '@domain/wine/wine.types'
import { WineCard } from './WineCard'
import { WineResultsGrid } from './WineResultsGrid'

async function mount(ui: React.ReactElement, lng: 'en-US' | 'es-AR' = 'es-AR') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  return render(<I18nextProvider i18n={i18n}><MemoryRouter>{ui}</MemoryRouter></I18nextProvider>)
}

const wine = {
  id: 'w1', name: 'Gran Malbec', type: 'red', imageUrl: 'https://example.org/broken.jpg', rating: 4.25,
  winery: 'Bodega Sur', country: 'Argentina', region: 'Mendoza', grapeVarieties: ['Malbec'],
} as unknown as WineSummary

it('shows the no-wines watercolor and offers to clear the filters when filters are active', async () => {
  const clear = vi.fn()
  await mount(<WineResultsGrid wines={[]} isLoading={false} isError={false} onRetry={vi.fn()} onClearFilters={clear} />)
  expect(screen.getByRole('heading', { name: es.wines.noWines })).toBeInTheDocument()
  expect(document.querySelector('img')).toHaveAttribute('src', illustrations.noWines)
  fireEvent.click(screen.getByRole('button', { name: es.wines.clearFilters }))
  expect(clear).toHaveBeenCalledTimes(1)
})

it('does not offer to clear filters when none are active', async () => {
  await mount(<WineResultsGrid wines={[]} isLoading={false} isError={false} onRetry={vi.fn()} />)
  expect(screen.queryByRole('button')).toBeNull()
})

it('loads the results with the page loader', async () => {
  await mount(<WineResultsGrid wines={[]} isLoading isError={false} onRetry={vi.fn()} />)
  expect(screen.getByRole('status', { name: es.common.loading })).toBeInTheDocument()
})

it('keeps the bottle frame when the wine photo fails and shows the rating as glasses', async () => {
  await mount(<WineCard wine={wine} />, 'en-US')
  const link = screen.getByRole('link', { name: /Gran Malbec/ })
  expect(link).toHaveAttribute('href', '/wines/w1')
  const photo = link.querySelector('img')!
  expect(photo).toHaveAttribute('alt', '')
  fireEvent.error(photo)
  expect(link.querySelector('img')).toHaveAttribute('src', '/images/mock/winebottle.webp')
  expect(screen.getByText('4.3')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: '4.3 out of 5' })).toBeInTheDocument()
})

it('lifts the wine card and zooms the bottle on hover, except under reduced motion', async () => {
  await mount(<WineCard wine={wine} />)
  const bottle = screen.getByRole('link').querySelector('img.drop-shadow-lg')!
  expect(bottle).toHaveClass('transition-transform', 'duration-500', 'group-hover:scale-105', 'motion-reduce:transition-none', 'motion-reduce:group-hover:scale-100')
  expect(bottle.closest('.group-hover\\:-translate-y-1')).toHaveClass('motion-reduce:transition-none', 'motion-reduce:group-hover:translate-y-0')
})

