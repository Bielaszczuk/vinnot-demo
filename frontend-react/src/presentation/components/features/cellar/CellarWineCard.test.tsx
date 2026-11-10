import { render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import type { CellarWine } from '@domain/cellar/cellar.types'
import { CellarWineCard } from './CellarWineCard'

const wine = { id: 'w1', name: 'Gran Reserva', type: 'RED', grapeVarieties: [], vintage: 2020, imageUrl: null, winery: 'Bodega' }
const entry = { id: 'c1', wine, rating: 4, notes: 'Silky', purchasePrice: null, vintage: null, reviewId: null,
  addedAt: new Date('2026-10-01') } as unknown as CellarWine

async function mount(lng: 'es-AR' | 'en-US', value: CellarWine) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'es-AR': { translation: es }, 'en-US': { translation: en } } })
  return render(<I18nextProvider i18n={i18n}><MemoryRouter>
    <CellarWineCard entry={value} onEdit={() => {}} onPublishReview={() => {}} onDelete={() => {}} />
  </MemoryRouter></I18nextProvider>)
}

describe('CellarWineCard vintage', () => {
  it('shows the tasted vintage pill instead of the catalog vintage', async () => {
    const view = await mount('es-AR', { ...entry, vintage: 2018 })
    expect(screen.getByText('Añada 2018')).toBeInTheDocument()
    expect(screen.queryByText('Añada 2020')).toBeNull()
    view.unmount()
    await mount('en-US', { ...entry, vintage: 2018 })
    expect(screen.getByText('Vintage 2018')).toBeInTheDocument()
  })

  it('keeps the private note unchanged when no vintage was recorded', async () => {
    await mount('en-US', entry)
    expect(screen.queryByText(/Vintage \d{4}/)).toBeNull()
    expect(screen.getByText(/Silky/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Gran Reserva' }).length).toBeGreaterThan(0)
  })

  it('shows the price paid in the app language and the decimal rating as glasses', async () => {
    await mount('en-US', { ...entry, purchasePrice: 1500, rating: 3.7, wine: { ...wine, type: 'white' } } as unknown as CellarWine)
    expect(screen.getByText(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ARS' }).format(1500).replace(/\s/g, ' '))).toBeInTheDocument()
    const glasses = screen.getByRole('img', { name: '3.7 out of 5' })
    expect(glasses.querySelector('img')).toHaveAttribute('src', '/images/rating/glass-tulip.webp')
    expect(screen.getByRole('button', { name: en.cellar.editNotes }).className).toContain('min-h-9')
  })
})

describe('CellarWineCard hover motion', () => {
  it('zooms the bottle on hover, except under reduced motion', async () => {
    await mount('en-US', { ...entry, wine: { ...wine, imageUrl: 'https://cdn.example/bottle.png' } } as unknown as CellarWine)
    const bottle = document.querySelector('img.drop-shadow-md')!
    expect(bottle).toHaveClass('transition-transform', 'duration-500', 'group-hover:scale-105', 'motion-reduce:transition-none', 'motion-reduce:group-hover:scale-100')
  })
})
