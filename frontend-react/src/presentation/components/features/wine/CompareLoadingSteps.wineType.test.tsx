/**
 * The comparison journey pours each wine in its own glass and colour, from
 * the types as the API sends them (`ROSE`, `SPARKLING`).
 */
import { act, render } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { CompareLoadingSteps, COMPARE_STEP_INTERVAL_MS } from './CompareLoadingSteps'

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

async function mount(firstType: string, secondType: string) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'en-US', resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  render(<I18nextProvider i18n={i18n}><CompareLoadingSteps firstType={firstType} secondType={secondType} /></I18nextProvider>)
  act(() => vi.advanceTimersByTime(COMPARE_STEP_INTERVAL_MS))
}

const layer = (id: string) => document.querySelector<HTMLElement>(`[data-layer="${id}"]`)
const image = (id: string) => layer(id)?.querySelector('img')?.getAttribute('src') ?? ''

it('pours each compared wine in its own glass and colour', async () => {
  await mount('ROSE', 'SPARKLING')
  expect(image('compare-first')).toContain('glass-rose')
  expect(layer('compare-first-rose')).not.toBeNull()
  expect(image('compare-second')).toContain('glass-flute')
  expect(layer('compare-second-sparkling')).not.toBeNull()
})

it('keeps two red wines in bordeaux glasses with red wine', async () => {
  await mount('RED', 'RED')
  expect(image('compare-first')).toContain('glass-red')
  expect(layer('compare-first-red')).not.toBeNull()
  expect(image('compare-second')).toContain('glass-red')
  expect(layer('compare-second-red')).not.toBeNull()
})
