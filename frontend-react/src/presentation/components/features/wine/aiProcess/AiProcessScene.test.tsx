import { act, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { AiProfileLoadingSteps, AI_PROFILE_STEP_INTERVAL_MS } from '../AiProfileLoadingSteps'
import { CompareLoadingSteps, COMPARE_STEP_INTERVAL_MS } from '../CompareLoadingSteps'
import { AiProcessSceneArt } from './AiProcessSceneArt'
import {
  keyframesCss,
  phase,
  sceneLayers,
  sceneTiming,
  settle,
  wineSceneLook,
  wineSceneLooks,
  type AiProcessSceneName,
} from './aiProcessScenes'

let reduceMotion = false
const listeners: Array<() => void> = []

beforeEach(() => {
  reduceMotion = false
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    get matches() { return query.includes('reduce') && reduceMotion },
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_: string, listener: () => void) => { listeners.push(listener) },
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  listeners.length = 0
})

async function mount(ui: React.ReactElement, lng: 'en-US' | 'es-AR' = 'es-AR') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

const layer = (id: string) => document.querySelector<HTMLElement>(`[data-layer="${id}"]`)

it('reports the profile journey as a progress bar that advances step by step and rests on the last', async () => {
  vi.useFakeTimers()
  await mount(<AiProfileLoadingSteps />)
  const bar = screen.getByRole('progressbar')
  expect(bar).toHaveAttribute('aria-valuemin', '1')
  expect(bar).toHaveAttribute('aria-valuemax', '5')
  expect(bar).toHaveAttribute('aria-valuenow', '1')
  expect(bar).toHaveAccessibleName(`${es.aiProfile.journey.title}. ${es.aiProfile.steps.uncorking}`)
  expect(screen.getAllByText(es.aiProfile.steps.uncorking)).toHaveLength(2)
  expect(document.querySelector('[data-scene="uncork"]')).toHaveAttribute('data-motion', 'once')
  act(() => vi.advanceTimersByTime(AI_PROFILE_STEP_INTERVAL_MS))
  expect(bar).toHaveAttribute('aria-valuenow', '2')
  expect(document.querySelector('[data-scene="visual"]')).not.toBeNull()
  act(() => vi.advanceTimersByTime(AI_PROFILE_STEP_INTERVAL_MS * 10))
  expect(bar).toHaveAttribute('aria-valuenow', '5')
  expect(bar).toHaveAttribute('aria-valuetext', `05 / 05 · ${es.aiProfile.steps.generating}`)
  expect(document.querySelector('[data-scene="report"]')).toHaveAttribute('data-motion', 'replay')
  expect(layer('writing-pen')!.getAttribute('style')).toContain('infinite')
})

it('draws the profile scenes for the wine type and animates the parts with keyframes', async () => {
  await mount(<AiProfileLoadingSteps wineType="sparkling" />, 'en-US')
  expect(screen.getByRole('progressbar')).toHaveAccessibleName(`${en.aiProfile.journey.title}. ${en.aiProfile.steps.uncorking}`)
  expect(layer('uncork-bottle-sparkling')).not.toBeNull()
  expect(layer('uncork-sparkling-cork')!.getAttribute('style')).toContain('vinnot-ai-uncork-flute-sparkling')
  expect(document.querySelector('style')!.textContent).toContain('@keyframes vinnot-ai-uncork-flute-sparkling')
  expect(layer('uncork-cage')).not.toBeNull()
})

it('shows the final pose without movement when the visitor prefers reduced motion', async () => {
  reduceMotion = true
  vi.useFakeTimers()
  await mount(<AiProfileLoadingSteps wineType="white" />)
  expect(document.querySelector('[data-scene="uncork"]')).toHaveAttribute('data-motion', 'still')
  expect(document.querySelector('style')).toBeNull()
  expect(layer('uncork-bottle-clear')).not.toBeNull()
  expect(layer('uncork-corkscrew')!.style.transform).toBe('translateY(-16px) scaleX(-1)')
  act(() => vi.advanceTimersByTime(AI_PROFILE_STEP_INTERVAL_MS * 5))
  expect(document.querySelector('[data-scene="report"]')).toHaveAttribute('data-motion', 'still')
})

it('follows a live change of the reduced motion preference', async () => {
  await mount(<AiProfileLoadingSteps />)
  expect(document.querySelector('[data-scene]')).toHaveAttribute('data-motion', 'once')
  reduceMotion = true
  act(() => listeners.forEach((listener) => listener()))
  expect(document.querySelector('[data-scene]')).toHaveAttribute('data-motion', 'still')
})

it('pours both compared wines in their own colors', async () => {
  vi.useFakeTimers()
  await mount(<CompareLoadingSteps firstType="red" secondType="white" />)
  expect(screen.getByRole('progressbar')).toHaveAccessibleName(`${es.compare.loading.title}. ${es.compare.steps.opening}`)
  act(() => vi.advanceTimersByTime(COMPARE_STEP_INTERVAL_MS))
  expect(layer('compare-first-red')).not.toBeNull()
  expect(layer('compare-second-white')).not.toBeNull()
  act(() => vi.advanceTimersByTime(COMPARE_STEP_INTERVAL_MS))
  expect(layer('structure-grapes-left')).not.toBeNull()
  act(() => vi.advanceTimersByTime(COMPARE_STEP_INTERVAL_MS))
  expect(layer('contrast-magnifier')).not.toBeNull()
})

it('uses a red wine until the type is known and draws one wine twice for a single profile', () => {
  expect(wineSceneLook()).toEqual(wineSceneLook('red'))
  expect(wineSceneLook('unknown')).toEqual(wineSceneLook('red'))
  expect(wineSceneLooks('rose').second).toEqual(wineSceneLook('rose'))
  expect(wineSceneLooks('rose', 'dessert').second.wine).toBe('amber')
})

it('builds every scene for every look', () => {
  const scenes: AiProcessSceneName[] = ['uncork', 'visual', 'bouquet', 'taste', 'report', 'compare', 'structure', 'contrast', 'recommendation']
  for (const type of ['red', 'fortified', 'rose', 'white', 'orange', 'dessert', 'sparkling']) {
    for (const scene of scenes) {
      const { container, unmount } = render(
        <AiProcessSceneArt scene={scene} looks={wineSceneLooks(type, 'sparkling')} waiting reducedMotion={false} />,
      )
      expect(container.querySelectorAll('[data-layer]').length).toBeGreaterThan(0)
      unmount()
      const still = render(<AiProcessSceneArt scene={scene} looks={wineSceneLooks(type)} waiting={false} reducedMotion />)
      expect(still.container.querySelector('style')).toBeNull()
      still.unmount()
    }
  }
})

it('samples tracks into keyframes that keep still runs still', () => {
  const timing = sceneTiming(1000, false)
  const css = keyframesCss('demo', (p) => ({ opacity: p < 0.5 ? '0' : '1' }), timing)
  expect(css).toBe('@keyframes demo{0%{opacity:0}47.5%{opacity:0}50%{opacity:1}100%{opacity:1}}')
  const loop = sceneTiming(1000, true)
  expect(loop.durationMs).toBe(1000 + 1600 + 700)
  expect(loop.points.at(-1)).toEqual([1.25, 100])
  expect(sceneLayers('report', wineSceneLooks()).map((item) => item.id)).toEqual(['writing-paper', 'writing-ink', 'writing-pen'])
  expect(phase(0.5, 0, 1)).toBe(0.5)
  expect(settle(1, 0, 1)).toBe(1)
})
