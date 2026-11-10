import { render, screen, within } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { CellarCover, type CellarCoverProps } from './CellarCover'

const filled: CellarCoverProps = {
  wineCount: 3,
  averageRatingLabel: '4,5',
  hasAverage: true,
  regionCount: 2,
  typeMix: [{ type: 'RED', count: 2 }, { type: 'MYSTERY', count: 1 }],
}

async function mount(lng: 'es-AR' | 'en-US', props: CellarCoverProps) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'es-AR': { translation: es }, 'en-US': { translation: en } } })
  return render(<I18nextProvider i18n={i18n}><MemoryRouter><CellarCover {...props} /></MemoryRouter></I18nextProvider>)
}

describe('CellarCover', () => {
  it('shows the illustration, the title over it, the add link and the stats like the app', async () => {
    await mount('es-AR', filled)
    expect(screen.getByTestId('cellar-cover-illustration')).toHaveAttribute('alt', '')
    expect(screen.getByRole('heading', { level: 1, name: es.cellar.title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: es.cellar.addWine })).toHaveAttribute('href', '/wines')
    const stats = screen.getByRole('list', { name: es.cellar.stats.label })
    expect(within(stats).getByText('3')).toBeInTheDocument()
    expect(within(stats).getByText(es.cellar.stats.wines)).toBeInTheDocument()
    expect(within(stats).getByText('4,5')).toBeInTheDocument()
    expect(within(stats).getByText(es.cellar.stats.average)).toBeInTheDocument()
    expect(within(stats).getByText('2')).toBeInTheDocument()
    expect(within(stats).getByText(es.cellar.stats.regions)).toBeInTheDocument()
    expect(screen.getByTestId('cellar-average-glass')).toBeInTheDocument()
    expect(screen.queryByText(/Invertido/)).toBeNull()
  })

  it('draws the type mix in proportion with a localized legend', async () => {
    await mount('en-US', filled)
    const mix = screen.getByRole('img', { name: `${en.cellar.stats.typeMix}: Red 2, MYSTERY 1` })
    expect(within(mix).getByTestId('cellar-type-mix-RED')).toHaveStyle({ flexGrow: String(2 / 3) })
    expect(within(mix).getByTestId('cellar-type-mix-MYSTERY')).toHaveStyle({ flexGrow: String(1 / 3) })
    expect(screen.getByText('Red · 2')).toBeInTheDocument()
    expect(screen.getByText('MYSTERY · 1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: en.cellar.title })).toBeInTheDocument()
    expect(screen.queryByText(/Invested/)).toBeNull()
  })

  it('shows a dash and no glass when nothing is rated', async () => {
    await mount('es-AR', { ...filled, averageRatingLabel: '—', hasAverage: false })
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByTestId('cellar-average-glass')).toBeNull()
  })

  it('shows only the title and the add link for an empty cellar, as the app does', async () => {
    await mount('es-AR', { wineCount: 0, averageRatingLabel: '—', hasAverage: false, regionCount: 0, typeMix: [] })
    expect(screen.getByRole('heading', { level: 1, name: es.cellar.title })).toBeInTheDocument()
    expect(screen.getByText(es.cellar.subtitle)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: es.cellar.addWine })).toHaveAttribute('href', '/wines')
    expect(screen.queryByTestId('cellar-cover-illustration')).toBeNull()
    expect(screen.queryByRole('list', { name: es.cellar.stats.label })).toBeNull()
  })
})
