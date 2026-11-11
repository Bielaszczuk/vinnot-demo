import { act, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { SCENE_ACTION_MS } from '@components/features/wine/aiProcess/aiProcessScenes'
import { TASTE_QUIZ_GATHER_STEP_MS, TASTE_QUIZ_STEP_INTERVAL_MS, TasteQuizLoadingSteps } from './TasteQuizLoadingSteps'

afterEach(() => {
  vi.useRealTimers()
})

async function mount(lng: 'en-US' | 'es-AR') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  return render(
    <I18nextProvider i18n={i18n}>
      <TasteQuizLoadingSteps picks={['RED_BERRIES', 'BROWNIE', 'MUSHROOM_PASTA', 'PEPPER_CINNAMON', 'CITRUS']} />
    </I18nextProvider>,
  )
}

const toLastStep = () => act(() => vi.advanceTimersByTime(TASTE_QUIZ_GATHER_STEP_MS + TASTE_QUIZ_STEP_INTERVAL_MS * 2))

it('ends by shaping the taste profile, in Spanish', async () => {
  vi.useFakeTimers()
  await mount('es-AR')
  toLastStep()
  expect(screen.getByRole('progressbar')).toHaveAccessibleName('Definiendo tu perfil de gustos. Dando forma a tu perfil de gustos')
  expect(screen.queryByText(/Pintando/)).not.toBeInTheDocument()
})

it('ends by shaping the taste profile, in English', async () => {
  vi.useFakeTimers()
  await mount('en-US')
  toLastStep()
  expect(screen.getByRole('progressbar')).toHaveAccessibleName('Defining your taste profile. Shaping your taste profile')
  expect(screen.queryByText(/Painting/)).not.toBeInTheDocument()
})

it('lets every scene finish its gesture calmly and rest on its final pose before the next one', async () => {
  vi.useFakeTimers()
  await mount('es-AR')
  const scene = () => document.querySelector('[data-scene]')!.getAttribute('data-scene')
  // The gesture starts 120 ms after the scene appears; the scene then rests for at least 0.4 s.
  const rest = (hold: number, actionMs: number) => hold - 120 - actionMs
  expect(rest(TASTE_QUIZ_GATHER_STEP_MS, SCENE_ACTION_MS.gather)).toBeGreaterThanOrEqual(400)
  for (const name of ['fill', 'blend'] as const) expect(rest(TASTE_QUIZ_STEP_INTERVAL_MS, SCENE_ACTION_MS[name])).toBeGreaterThanOrEqual(400)
  // A calm pace: no gesture is rushed.
  expect(SCENE_ACTION_MS.gather).toBeGreaterThanOrEqual(3200)
  for (const name of ['fill', 'blend', 'paint'] as const) expect(SCENE_ACTION_MS[name]).toBeGreaterThanOrEqual(2400)
  expect(scene()).toBe('gather')
  act(() => vi.advanceTimersByTime(TASTE_QUIZ_GATHER_STEP_MS - 1))
  expect(scene()).toBe('gather')
  act(() => vi.advanceTimersByTime(1))
  expect(scene()).toBe('fill')
  act(() => vi.advanceTimersByTime(TASTE_QUIZ_STEP_INTERVAL_MS))
  expect(scene()).toBe('blend')
  act(() => vi.advanceTimersByTime(TASTE_QUIZ_STEP_INTERVAL_MS))
  expect(scene()).toBe('paint')
})
