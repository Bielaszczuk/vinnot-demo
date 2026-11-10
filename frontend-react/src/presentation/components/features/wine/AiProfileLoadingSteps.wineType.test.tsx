/**
 * The profile journey draws the glass, the wine colour and the bottle of the
 * wine being profiled, from the type as the API sends it (`ROSE`, `SPARKLING`).
 */
import { act, render } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { AiProfileLoadingSteps, AI_PROFILE_STEP_INTERVAL_MS } from './AiProfileLoadingSteps'

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function mount(wineType: string) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'es-AR', resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  render(<I18nextProvider i18n={i18n}><AiProfileLoadingSteps wineType={wineType} /></I18nextProvider>)
}

const layer = (id: string) => document.querySelector<HTMLElement>(`[data-layer="${id}"]`)
const image = (id: string) => layer(id)?.querySelector('img')?.getAttribute('src') ?? ''

/** Opens the bottle, then moves on to the pour into the glass. */
function pourIntoGlass() {
  act(() => vi.advanceTimersByTime(AI_PROFILE_STEP_INTERVAL_MS))
}

it('draws a rosé in the rosé glass, rosé colour and clear rosé bottle', async () => {
  await mount('ROSE')
  expect(layer('uncork-bottle-clear')).not.toBeNull()
  expect(image('uncork-bottle-clear')).toContain('bottle-clear-rose')
  pourIntoGlass()
  expect(image('visual-glass')).toContain('glass-rose')
  expect(layer('visual-glass-rose')).not.toBeNull()
})

it('draws a sparkling white in the flute with its pale gold wine and the sparkling bottle', async () => {
  await mount('SPARKLING')
  expect(image('uncork-bottle-sparkling')).toContain('bottle-sparkling')
  pourIntoGlass()
  expect(image('visual-glass')).toContain('glass-flute')
  expect(layer('visual-glass-sparkling')).not.toBeNull()
  expect(layer('visual-glass-bubble-0')).not.toBeNull()
})

it('keeps a red wine in the bordeaux glass, red colour and dark bottle', async () => {
  await mount('RED')
  expect(image('uncork-bottle-dark')).toMatch(/\/loading\/bottle\.webp$/)
  pourIntoGlass()
  expect(image('visual-glass')).toContain('glass-red')
  expect(layer('visual-glass-red')).not.toBeNull()
})
