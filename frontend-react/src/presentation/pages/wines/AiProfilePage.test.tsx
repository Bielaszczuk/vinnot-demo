import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createInstance, type TFunction } from 'i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { servingArtUrl } from '@shared/profileArt'
import { AiProfilePage } from './AiProfilePage'
import { buildProfileArtView } from './aiProfileArt'

const vm = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('./useAiProfileViewModel', () => ({ useAiProfileViewModel: () => vm.current }))
vi.mock('@components/features/wine/AiProfileLoadingSteps', () => ({ AiProfileLoadingSteps: () => <div>loading</div> }))
vi.mock('./AiProfileActionBar', () => ({ AiProfileActionBar: () => null }))

async function translator(lng: 'es-AR' | 'en-US'): Promise<TFunction> {
  const i18n = createInstance()
  await i18n.init({ lng, resources: { 'es-AR': { translation: es }, 'en-US': { translation: en } } })
  return i18n.t
}

function show(t: TFunction, overrides: Record<string, unknown>) {
  vm.current = {
    id: 'w1', t, wine: { name: 'Reserva Pinot Noir', grapeVarieties: ['Pinot Noir'] }, profile: null,
    isLoading: false, isError: false, error: null, regeneratePending: false,
    handleRegenerate: vi.fn(), goBack: vi.fn(), palateAnalysis: undefined,
    ...overrides,
  }
  render(<AiProfilePage />)
}

beforeEach(() => vi.clearAllMocks())

describe('wine without an AI profile yet', () => {
  it('shows an empty state with the generate action, not a raw error', async () => {
    const handleRegenerate = vi.fn()
    show(await translator('en-US'), { handleRegenerate })
    expect(screen.getByText(en.aiProfile.emptyTitle)).toBeInTheDocument()
    expect(screen.queryByText(en.aiProfile.errorTitle)).toBeNull()
    expect(screen.queryByText(/status code 404/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Generate profile' }))
    expect(handleRegenerate).toHaveBeenCalledOnce()
  })

  it('names the action the same way in Spanish', async () => {
    show(await translator('es-AR'), {})
    expect(screen.getByText(es.aiProfile.emptyTitle)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generar perfil' })).toBeInTheDocument()
  })

  it('keeps the error state for real failures', async () => {
    show(await translator('en-US'), { isError: true, error: new Error('Server unavailable') })
    expect(screen.getByText(en.aiProfile.errorTitle)).toBeInTheDocument()
    expect(screen.getByText(en.errors.serverErrorDescription)).toBeInTheDocument()
    expect(screen.queryByText('Server unavailable')).toBeNull()
    cleanup()
  })
})

describe('profile header', () => {
  it('does not repeat a grape the wine name already contains', async () => {
    show(await translator('en-US'), { profile: { summary: 'Fresh' } })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Reserva Pinot Noir$/)
  })
})

describe('palate analysis', () => {
  it('keeps each label apart from its description and skips the scores the profile does not have', async () => {
    show(await translator('es-AR'), {
      profile: { summary: 'Fresh' },
      palateAnalysis: { sweetness: 'Seco, sin azúcar residual perceptible', acidityScore: 70, tannin: '', body: 'Medio' },
    })
    const bars = screen.getAllByTestId('palate-bar')
    expect(bars).toHaveLength(3)
    const [label, description] = bars[0]!.firstElementChild!.children
    expect(label).toHaveTextContent(es.aiProfile.palate.sweetness)
    expect(description).toHaveTextContent('Seco, sin azúcar residual perceptible')
    expect(bars[0]!.firstElementChild).toHaveClass('gap-4')
    expect(description).toHaveClass('text-right')
    expect(bars[1]).toHaveTextContent(`${es.aiProfile.palate.acidity}70%`)
    expect(screen.queryByText(es.aiProfile.palate.tannins)).toBeNull()
  })
})

describe('section art', () => {
  const profile = {
    summary: 'Fresh',
    aromaticProfile: { intensity: 'Media', primaryAromas: ['Frambuesa', 'Café'], bouquet: '' },
    flavorProfile: { primaryFlavors: ['Pera'], intensity: 'Media', finish: 'Largo' },
    foodPairings: { pairings: ['Pollo asado con hierbas'] },
    servingRecommendations: { temperature: '16-18 °C', glassware: 'Copa amplia', decanting: 'Decantar 30 minutos', agingPotential: '5 años' },
    profileArt: {
      aromas: [{ label: 'Frambuesa', art: 'RASPBERRY' }, { label: 'Café', art: 'COFFEE' }],
      flavors: [{ label: 'Pera', art: 'PEAR' }],
      pairings: [{ label: 'Pollo asado con hierbas', art: 'POULTRY' }],
      serving: { glass: 'RED_BALLOON', decant: true, temperature: { min: 16, max: 18 } },
    },
  }

  it('puts each section its own art: aromas, flavors, dishes and the serving set', async () => {
    show(await translator('es-AR'), {
      profile,
      art: buildProfileArtView(profile as never),
      palateAnalysis: { sweetness: 'Seco', acidityScore: 70 },
    })
    expect(within(screen.getByTestId('aroma-art')).getByTestId('vignette-item')).toHaveTextContent('Frambuesa')
    expect(within(screen.getByTestId('flavor-art')).getByTestId('vignette-item')).toHaveTextContent('Pera')
    expect(within(screen.getByTestId('pairing-art')).getByTestId('vignette-item')).toHaveTextContent('Pollo asado con hierbas')
    expect(screen.getByTestId('thermometer-mercury')).toHaveAttribute('data-level', '68')
    const servingSources = Array.from(screen.getByTestId('serving-art').querySelectorAll('img')).map((img) => img.getAttribute('src'))
    expect(servingSources).toEqual([servingArtUrl('RED_BALLOON'), servingArtUrl('DECANTER'), servingArtUrl('CELLAR')])
    const glassBox = screen.getAllByTestId('serving-box')[1]!
    expect(glassBox.firstElementChild?.querySelector('img')).toHaveAttribute('src', servingArtUrl('RED_BALLOON'))
    expect(glassBox.lastElementChild).toHaveTextContent('Copa amplia')
    for (const bar of screen.getAllByTestId('palate-bar-fill')) expect(bar).toHaveClass('profile-bar-fill')
  })

  it('shows no art when the profile carries none, keeping the text and icons', async () => {
    show(await translator('en-US'), { profile: { ...profile, profileArt: null } })
    expect(screen.queryByTestId('vignette-item')).toBeNull()
    expect(screen.queryByTestId('thermometer-mercury')).toBeNull()
    expect(screen.getByText('Frambuesa')).toBeInTheDocument()
    expect(screen.getByText('Copa amplia')).toBeInTheDocument()
  })
})
