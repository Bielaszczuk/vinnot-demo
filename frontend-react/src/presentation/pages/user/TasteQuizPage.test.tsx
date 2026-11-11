import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tasteQuizService } from '@services/tasteQuiz.service'
import { renderWithProviders, translate } from '../social/socialTestUtils'
import { TASTE_QUIZ_GATHER_STEP_MS, TASTE_QUIZ_STEP_INTERVAL_MS } from '@components/features/tasteQuiz/TasteQuizLoadingSteps'
import { TasteQuizPage } from './TasteQuizPage'
import { SCENE_ACTION_MS } from '@components/features/wine/aiProcess/aiProcessScenes'
import { TASTE_QUIZ_MIN_ANIMATION_MS } from './useTasteQuizViewModel'

vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' }, isAuthenticated: true }) }))
vi.mock('@hooks/useReducedMotion', () => ({ useReducedMotion: () => false }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate, i18n: { language: 'es-AR' } }) }))
vi.mock('@services/tasteQuiz.service', () => ({
  tasteQuizService: { get: vi.fn(), complete: vi.fn(), skip: vi.fn() },
}))

function Where() {
  const { pathname, search } = useLocation()
  return <p>route:{pathname}{search}</p>
}

const mount = (path = '/taste-quiz') =>
  renderWithProviders(
    <>
      <Route path="/taste-quiz" element={<TasteQuizPage />} />
      <Route path="/" element={<Where />} />
      <Route path="/wines" element={<Where />} />
      <Route path="/users/:id" element={<Where />} />
    </>,
    path,
  )

const wait = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
const option = (key: string) => screen.getByRole('button', { name: `tasteQuiz.options.${key}` })
const heading = () => screen.getByRole('heading', { level: 1 })

async function choose(key: string) {
  fireEvent.click(option(key))
  await wait(600)
}

const chosen = ['DARK_CHOCOLATE_COFFEE', 'RED_BERRIES', 'BROWNIE', 'MUSHROOM_PASTA', 'PEPPER_CINNAMON']

describe('TasteQuizPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(tasteQuizService.get).mockResolvedValue({ status: 'PENDING', answers: null, shouldPrompt: true })
    vi.mocked(tasteQuizService.complete).mockResolvedValue(undefined)
    vi.mocked(tasteQuizService.skip).mockResolvedValue(undefined)
  })
  afterEach(() => vi.useRealTimers())

  it('shows the first question with its illustrated options and the progress', async () => {
    const { container } = mount()
    expect(heading()).toHaveTextContent('tasteQuiz.questions.RAINY_DAY')
    expect(screen.getByText('tasteQuiz.progress:1|5')).toBeInTheDocument()
    expect(option('DARK_CHOCOLATE_COFFEE')).toHaveAttribute('aria-pressed', 'false')
    expect(option('SPICED_TEA_APPLE_TART')).toBeInTheDocument()
    expect(container.querySelectorAll('img[alt=""][src*="quiz"]')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'tasteQuiz.skip' })).toBeInTheDocument()
  })

  it('marks the tapped option and moves to the next question after a short beat', async () => {
    mount()
    fireEvent.click(option('DARK_CHOCOLATE_COFFEE'))
    expect(option('DARK_CHOCOLATE_COFFEE')).toHaveAttribute('aria-pressed', 'true')
    expect(heading()).toHaveTextContent('tasteQuiz.questions.RAINY_DAY')
    await wait(600)
    expect(heading()).toHaveTextContent('tasteQuiz.questions.FRUIT')
    expect(screen.getByText('tasteQuiz.progress:2|5')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /tasteQuiz.options/ })).toHaveLength(4)
  })

  it('goes back to the previous question with its answer still selected', async () => {
    mount()
    expect(screen.queryByRole('button', { name: 'tasteQuiz.back' })).toBeNull()
    await choose('SPICED_TEA_APPLE_TART')
    fireEvent.click(screen.getByRole('button', { name: 'tasteQuiz.back' }))
    expect(heading()).toHaveTextContent('tasteQuiz.questions.RAINY_DAY')
    expect(option('SPICED_TEA_APPLE_TART')).toHaveAttribute('aria-pressed', 'true')
    expect(option('DARK_CHOCOLATE_COFFEE')).toHaveAttribute('aria-pressed', 'false')
  })

  it('records the skip and returns to where the member came from', async () => {
    mount('/taste-quiz?returnUrl=%2Fwines')
    await screen.findByRole('heading', { level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'tasteQuiz.skip' }))
    expect(await screen.findByText('route:/wines')).toBeInTheDocument()
    expect(tasteQuizService.skip).toHaveBeenCalledOnce()
  })

  it('goes Home after skipping when there is nowhere to return to', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'tasteQuiz.skip' }))
    expect(await screen.findByText('route:/')).toBeInTheDocument()
    expect(tasteQuizService.skip).toHaveBeenCalledOnce()
  })

  it('only leaves when skipping a retake, keeping the completed quiz', async () => {
    vi.mocked(tasteQuizService.get).mockResolvedValue({
      status: 'COMPLETED',
      answers: { RAINY_DAY: 'DARK_CHOCOLATE_COFFEE', FRUIT: 'CITRUS', DESSERT: 'BROWNIE', DINNER: 'LEMON_FISH', AROMA: 'CUT_GRASS' },
      shouldPrompt: false,
    })
    mount('/taste-quiz?returnUrl=%2Fusers%2Fme')
    await wait(0)
    fireEvent.click(screen.getByRole('button', { name: 'tasteQuiz.skip' }))
    expect(await screen.findByText('route:/users/me')).toBeInTheDocument()
    expect(tasteQuizService.skip).not.toHaveBeenCalled()
  })

  it('sends the five answers, plays the profile animation for a while and opens the own profile', async () => {
    mount()
    for (const key of chosen) await choose(key)
    expect(tasteQuizService.complete).toHaveBeenCalledWith({
      RAINY_DAY: 'DARK_CHOCOLATE_COFFEE',
      FRUIT: 'RED_BERRIES',
      DESSERT: 'BROWNIE',
      DINNER: 'MUSHROOM_PASTA',
      AROMA: 'PEPPER_CINNAMON',
    })
    expect(screen.getByRole('heading', { name: 'tasteQuiz.loading.title' })).toBeInTheDocument()
    // The request already answered, yet the animation stays to be enjoyed.
    await wait(TASTE_QUIZ_MIN_ANIMATION_MS - 1000)
    expect(screen.getByRole('heading', { name: 'tasteQuiz.loading.title' })).toBeInTheDocument()
    await wait(1000)
    expect(await screen.findByText('route:/users/me')).toBeInTheDocument()
  })

  it('tells the profile taking shape in four new scenes, in order, drawn with the options the member picked', async () => {
    vi.mocked(tasteQuizService.complete).mockReturnValue(new Promise<void>(() => {}))
    mount()
    for (const key of chosen) await choose(key)
    const scene = () => document.querySelector('[data-scene]')!.getAttribute('data-scene')
    expect(scene()).toBe('gather')
    expect(screen.getByRole('progressbar')).toHaveAccessibleName('tasteQuiz.loading.title. tasteQuiz.loading.steps.gather')
    const sources = [...document.querySelectorAll('[data-layer^="gather-pick-"] img')].map((image) => image.getAttribute('src'))
    expect(sources).toHaveLength(5)
    ;['dark-chocolate-coffee', 'red-berries', 'brownie', 'mushroom-pasta', 'pepper-cinnamon'].forEach((name, index) => {
      expect(sources[index]).toContain(name)
    })
    // The journal step stays longer, so the pen can draw every pick and write its note.
    await wait(TASTE_QUIZ_STEP_INTERVAL_MS)
    expect(scene()).toBe('gather')
    await wait(TASTE_QUIZ_GATHER_STEP_MS - TASTE_QUIZ_STEP_INTERVAL_MS)
    expect(scene()).toBe('fill')
    // The picks live in the journal only: the glass fills and its aromas rise, no cut-outs fly around.
    expect(document.querySelectorAll('[data-layer^="fill-pick-"]')).toHaveLength(0)
    expect(document.querySelectorAll('[data-layer^="fill-wisp-"]')).toHaveLength(3)
    await wait(TASTE_QUIZ_STEP_INTERVAL_MS)
    expect(scene()).toBe('blend')
    await wait(TASTE_QUIZ_STEP_INTERVAL_MS)
    expect(scene()).toBe('paint')
    expect(screen.getByRole('progressbar')).toHaveAccessibleName('tasteQuiz.loading.title. tasteQuiz.loading.steps.paint')
    // The last scene keeps painting the wheel while the answers are still being saved.
    await wait(TASTE_QUIZ_STEP_INTERVAL_MS * 4)
    expect(scene()).toBe('paint')
    expect(document.querySelector('[data-scene="paint"]')).toHaveAttribute('data-motion', 'replay')
  })

  it('keeps the whole journey on screen before opening the profile, even when the answers are saved at once', () => {
    // Every step stays for its hold, and the last one at least as long as the others, so the wheel takes shape and rests.
    expect(TASTE_QUIZ_MIN_ANIMATION_MS).toBeGreaterThan(TASTE_QUIZ_GATHER_STEP_MS + TASTE_QUIZ_STEP_INTERVAL_MS * 3)
    expect(TASTE_QUIZ_MIN_ANIMATION_MS).toBeGreaterThan(TASTE_QUIZ_GATHER_STEP_MS + TASTE_QUIZ_STEP_INTERVAL_MS * 2 + 120 + SCENE_ACTION_MS.paint)
    // A calm journey of about thirteen seconds, not much longer.
    expect(TASTE_QUIZ_MIN_ANIMATION_MS).toBeLessThanOrEqual(14000)
  })

  it('offers a friendly retry that keeps the answers when saving fails', async () => {
    vi.mocked(tasteQuizService.complete).mockRejectedValueOnce(new Error('offline'))
    mount()
    for (const key of chosen) await choose(key)
    await wait(TASTE_QUIZ_MIN_ANIMATION_MS)
    expect(await screen.findByText('tasteQuiz.error.title')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'tasteQuiz.error.retry' }))
    await waitFor(() => expect(tasteQuizService.complete).toHaveBeenCalledTimes(2))
    expect(vi.mocked(tasteQuizService.complete).mock.calls[1]![0]).toEqual(vi.mocked(tasteQuizService.complete).mock.calls[0]![0])
    await wait(TASTE_QUIZ_MIN_ANIMATION_MS)
    expect(await screen.findByText('route:/users/me')).toBeInTheDocument()
  })
})
