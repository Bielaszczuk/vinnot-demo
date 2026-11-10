import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { winesService } from '@services/wines.service'
import type { WineComparison } from '@domain/wine/wine.types'
import { WineComparePage } from '../WineComparePage'

vi.mock('@services/wines.service', () => ({ winesService: { compareWines: vi.fn() } }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { wine?: string }) => (options?.wine ? `${key}(${options.wine})` : key),
    i18n: { language: 'es' },
  }),
}))
vi.mock('@hooks/queries/wine/useWine', () => ({ useWine: (id: string) => ({ data: { id, name: `Wine ${id}`, grapeVarieties: [], winery: 'Winery' } }) }))
vi.mock('@hooks/queries/wine/useWineSearch', () => ({ useWineSearch: () => ({}) }))
vi.mock('@components/features/wine', () => ({ CompareLoadingSteps: () => <div role="status">comparing</div> }))

afterEach(() => { vi.resetAllMocks() })

const legacyAttributes = ['Cuerpo', 'Taninos', 'Acidez', 'Dulzor', 'Alcohol', 'Final'].map((name, index) => ({
  name, wineAValue: `A ${name}`, wineBValue: `B ${name}`, wineAScore: 40 + index, wineBScore: 30 + index,
}))

const legacy: WineComparison = {
  wines: [], attributes: [], aiSummary: 'Legacy summary', summary: 'Legacy summary',
  similarities: ['Both from Mendoza'], keyDifferences: ['A is fresher'],
  attributeComparison: { attributes: legacyAttributes },
  bestFor: { wineA: ['Grilled fish'], wineB: ['Stews'] },
  recommendationWineA: 'Pick A for freshness', recommendationWineB: 'Pick B for warmth',
  recommendation: 'Legacy verdict', fromCache: true,
}

const rich: WineComparison = {
  ...legacy,
  summary: 'Rich summary of both wines',
  recommendation: 'Rich final verdict',
  attributeComparison: { attributes: legacyAttributes.map((attribute, index) => ({ ...attribute, key: index === 0 ? 'body' : undefined })) },
  tastingNotes: {
    wineA: { identity: 'Gualtallary altitude', appearance: 'Deep violet', nose: 'Violets', palate: 'Chalky', finish: 'Saline' },
    wineB: { identity: 'Luján oak classic', nose: 'Plum and vanilla' },
  },
  chooseIf: [
    { pick: 'A', situation: 'Grilled lamb', why: 'Acidity cuts the fat' },
    { pick: 'B', situation: 'A cold night' },
  ],
  pairings: {
    wineA: [{ dish: 'Lamb with chimichurri', why: 'Herbal lift' }],
    wineB: [{ dish: 'Braised short ribs' }],
    shared: { dish: 'Aged provoleta', why: 'Both handle the salt' },
  },
  serving: { wineA: { temperature: '16 °C', decanting: '30 minutes' }, wineB: { temperature: '18 °C' } },
  aging: { wineA: 'Drink 2026-2032', wineB: null },
  value: 'Wine B costs less for a similar rating.',
}

async function renderComparison(comparison: WineComparison) {
  vi.mocked(winesService.compareWines).mockResolvedValue(comparison)
  const client = new QueryClient()
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/wines/compare/a?compareWith=b']}>
        <Routes><Route path="/wines/compare/:wineAId" element={<WineComparePage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByText(comparison.recommendation ?? '')
  return { ...view, client }
}

const newSectionTitles = [
  'compare.summary', 'compare.tastingNotes.title', 'compare.chooseIf.title',
  'compare.pairings.title', 'compare.serving.title', 'compare.value', 'compare.verdict',
]

describe('richer comparison sections', () => {
  it('renders every new section in order with its data and the verdict as a callout', async () => {
    const { unmount, client } = await renderComparison(rich)
    try {
      expect(screen.getByText('Rich summary of both wines')).toBeInTheDocument()

      const notes = screen.getByRole('region', { name: 'compare.tastingNotes.title' })
      expect(within(notes).getByText('Gualtallary altitude')).toBeInTheDocument()
      expect(within(notes).getByText('Deep violet')).toBeInTheDocument()
      expect(within(notes).getByText('Plum and vanilla')).toBeInTheDocument()
      expect(within(notes).getByText('Luján oak classic')).toBeInTheDocument()

      const chooseIf = screen.getByRole('region', { name: 'compare.chooseIf.title' })
      expect(within(chooseIf).getByText('compare.chooseIf.pickWine(Wine a)')).toBeInTheDocument()
      expect(within(chooseIf).getByText('compare.chooseIf.pickWine(Wine b)')).toBeInTheDocument()
      expect(within(chooseIf).getByText('Grilled lamb')).toBeInTheDocument()
      expect(within(chooseIf).getByText('Acidity cuts the fat')).toBeInTheDocument()
      expect(within(chooseIf).getByText('A cold night')).toBeInTheDocument()

      const pairings = screen.getByRole('region', { name: 'compare.pairings.title' })
      expect(within(pairings).getByText('Lamb with chimichurri')).toBeInTheDocument()
      expect(within(pairings).getByText('Braised short ribs')).toBeInTheDocument()
      expect(within(pairings).getByText('compare.pairings.shared')).toBeInTheDocument()
      expect(within(pairings).getByText('Aged provoleta')).toBeInTheDocument()

      const serving = screen.getByRole('region', { name: 'compare.serving.title' })
      expect(within(serving).getByText('16 °C')).toBeInTheDocument()
      expect(within(serving).getByText('30 minutes')).toBeInTheDocument()
      expect(within(serving).getByText('18 °C')).toBeInTheDocument()
      expect(within(serving).getByText('Drink 2026-2032')).toBeInTheDocument()

      expect(screen.getByRole('region', { name: 'compare.value' })).toHaveTextContent('Wine B costs less for a similar rating.')

      const verdict = screen.getByRole('note', { name: 'compare.verdict' })
      expect(verdict).toHaveTextContent('Rich final verdict')

      const order = ['Rich summary of both wines', 'compare.attributes', 'compare.tastingNotes.title', 'compare.keyDifferences',
        'compare.chooseIf.title', 'compare.pairings.title', 'compare.serving.title', 'compare.value', 'Pick A for freshness', 'Rich final verdict']
        .map((text) => screen.getAllByText(text)[0]!)
      for (let index = 1; index < order.length; index += 1) {
        expect(order[index - 1]!.compareDocumentPosition(order[index]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      }
    } finally { unmount(); client.clear() }
  })

  it('renders legacy content (no new fields, six name-only attributes) exactly with the existing sections', async () => {
    const { unmount, client } = await renderComparison(legacy)
    try {
      for (const title of newSectionTitles) expect(screen.queryByText(title)).not.toBeInTheDocument()
      expect(screen.queryByText('Legacy summary')).not.toBeInTheDocument()
      expect(screen.queryByRole('note')).not.toBeInTheDocument()

      for (const attribute of legacyAttributes) expect(screen.getByText(attribute.name)).toBeInTheDocument()
      expect(screen.getByText('compare.keyDifferences')).toBeInTheDocument()
      expect(screen.getByText('A is fresher')).toBeInTheDocument()
      expect(screen.getByText('Both from Mendoza')).toBeInTheDocument()
      expect(screen.getByText('Grilled fish')).toBeInTheDocument()
      expect(screen.getByText('Stews')).toBeInTheDocument()
      expect(screen.getByText('Pick A for freshness')).toBeInTheDocument()
      expect(screen.getByText('Pick B for warmth')).toBeInTheDocument()
      expect(screen.getByText('Legacy verdict')).toBeInTheDocument()
    } finally { unmount(); client.clear() }
  })

  it('hides each new section whose data is absent', async () => {
    const { unmount, client } = await renderComparison({ ...legacy, recommendation: 'Only value', value: 'Fair price' })
    try {
      expect(screen.getByRole('region', { name: 'compare.value' })).toHaveTextContent('Fair price')
      for (const title of ['compare.tastingNotes.title', 'compare.chooseIf.title', 'compare.pairings.title', 'compare.serving.title']) {
        expect(screen.queryByText(title)).not.toBeInTheDocument()
      }
      expect(screen.getByRole('note', { name: 'compare.verdict' })).toHaveTextContent('Only value')
    } finally { unmount(); client.clear() }
  })
})

it('grows the attribute bars over time, except under reduced motion', async () => {
  const { unmount, client } = await renderComparison(legacy)
  try {
    for (const score of ['40', '30']) {
      expect(screen.getByText(score).parentElement).toHaveClass('transition-all', 'duration-1000', 'motion-reduce:transition-none')
    }
  } finally { unmount(); client.clear() }
})
