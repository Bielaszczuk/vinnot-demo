import { render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { WineryWineCard } from '@components/features/winery/WineryWineCard'
import { CellarWineCard } from '@components/features/cellar/CellarWineCard'
import type { WineSummary } from '@domain/wine/wine.types'
import type { CellarWine } from '@domain/cellar/cellar.types'

async function mount(lng: 'es-AR' | 'en-US', node: React.ReactNode) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'es-AR': { translation: es }, 'en-US': { translation: en } } })
  render(<I18nextProvider i18n={i18n}><MemoryRouter>{node}</MemoryRouter></I18nextProvider>)
}

const wine = { id: 'w1', name: 'Gran Reserva', type: 'RED', grapeVarieties: [], vintage: 2020, rating: null, imageUrl: null, winery: 'Bodega' } as unknown as WineSummary
const entry = { id: 'c1', wine, rating: null, notes: null, purchasePrice: null, reviewId: null } as unknown as CellarWine

describe('wine type is rendered through i18n', () => {
  it('shows the winery page wine type in the active language', async () => {
    await mount('es-AR', <WineryWineCard wine={wine} />)
    expect(screen.getByText('Tinto')).toBeInTheDocument()
    expect(screen.queryByText('RED')).toBeNull()
  })

  it('shows the cellar wine type in the active language', async () => {
    await mount('es-AR', <CellarWineCard entry={entry} onEdit={() => {}} onPublishReview={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('Tinto')).toBeInTheDocument()
  })

  it('uses the English name in English', async () => {
    await mount('en-US', <WineryWineCard wine={wine} />)
    expect(screen.getByText('Red')).toBeInTheDocument()
  })
})
