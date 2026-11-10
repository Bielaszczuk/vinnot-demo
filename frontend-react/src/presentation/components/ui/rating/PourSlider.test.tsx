import { act, fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { PourRating } from './PourRating'
import { GHOST_CYCLE_MS, GHOST_FADE_IN_MS, GHOST_SLIDE_MS, POUR_GLASS_HEIGHT, UNCORK_MS, barLayout, barThumbLeft, barXAtRating, glassLeft, pourLayout } from './pourGeometry'
import { TRACK_GRADIENTS, ratingLook } from './ratingLook'
import { ratingGestureStorage } from '@/infrastructure/storage/ratingGesture.storage'

async function mount(ui: React.ReactElement, lng: 'en-US' | 'es-AR' = 'en-US') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

function Controlled({ initial = 0, onChange }: { initial?: number; onChange?: (value: number) => void }) {
  const [value, setValue] = useState(initial)
  return <PourRating value={value} onChange={(next) => { setValue(next); onChange?.(next) }} wineType="white" />
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
})

const look = ratingLook('white')
const layout = pourLayout(POUR_GLASS_HEIGHT.md, look)
const bar = barLayout(layout, look)
const glassCentre = (index: number) => glassLeft(layout, index) + layout.glassWidth / 2
// A hair past the exact spot, so float noise cannot round a .x5 score down.
const xOnBar = (score: number) => barXAtRating(score, layout) + 1e-6
// The bottle's own scale, for dragging the bottle.
const xOnBottle = (score: number) => layout.side + (score / 5) * layout.inner + 1e-6
const thumbLeft = (score: number) => `${barThumbLeft(score, layout, bar)}px`
const fillWidth = (score: number) => `${barXAtRating(score, layout) - bar.trackLeft}px`

const barEl = () => screen.getByTestId('pour-bar')
const thumb = () => barEl().querySelector<HTMLElement>(':scope > .vp-bar-thumb')!
const thumbFill = () => Number(thumb().querySelector('.vinnot-glass')!.getAttribute('data-fill'))
const trackFill = () => barEl().querySelector<HTMLElement>(':scope > .vp-bar-fill')!
const barGhost = () => screen.queryByTestId('pour-bar-ghost')
const glassFillsAbove = () =>
  [...screen.getByRole('slider').querySelectorAll('.vinnot-glass')].map((glass) => glass.getAttribute('data-fill'))

function reduceMotion() {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }))
}

describe('PourRating slider bar', () => {
  it('sits under the glasses with the glass of the wine type empty at the start of the track when not rated', async () => {
    await mount(<PourRating value={0} onChange={() => {}} wineType="white" />)
    const card = barEl().closest('.vinnot-pour-card')
    expect(card).not.toBeNull()
    expect(barEl().closest('[role="slider"]')).toBeNull()
    expect(barEl().style.width).toBe(`${bar.width}px`)
    expect(thumb().querySelector('img')!.getAttribute('src')).toContain('glass-tulip')
    expect(thumbFill()).toBe(0)
    expect(thumb().style.left).toBe(thumbLeft(0))
    expect(trackFill().style.width).toBe('0px')
    // The track runs from the score 0, over the bottle stand, to the last glass centre.
    const track = barEl().querySelector<HTMLElement>('.vp-bar-track')!
    expect(parseFloat(track.style.left)).toBeCloseTo(glassCentre(0) - layout.slot, 3)
    expect(parseFloat(track.style.left) + parseFloat(track.style.width)).toBeCloseTo(glassCentre(4), 3)
    // The track runs through the middle of the glass, like a slider thumb.
    const glass = thumb().querySelector<HTMLElement>('.vinnot-glass')!
    expect(glass.style.height).toBe(`${bar.glassHeight}px`)
    expect(barEl().style.height).toBe(`${bar.glassHeight}px`)
    expect(parseFloat(trackFill().style.top) + 2.5).toBe(bar.glassHeight / 2)
    expect(parseFloat(barEl().querySelector<HTMLElement>('.vp-bar-track')!.style.top) + 2.5).toBe(bar.glassHeight / 2)
    // The wine track is a gradient of the wine type, deepest hue to rim.
    expect(trackFill().style.getPropertyValue('--vp-bar-from')).toBe(TRACK_GRADIENTS.white[0])
    expect(trackFill().style.getPropertyValue('--vp-bar-to')).toBe(TRACK_GRADIENTS.white[1])
  })

  it('places the glass and the wine track at the score and fills the glass by score / 5', async () => {
    await mount(<PourRating value={3.6} onChange={() => {}} wineType="white" />)
    expect(thumb().style.left).toBe(thumbLeft(3.6))
    expect(trackFill().style.left).toBe(`${bar.trackLeft}px`)
    expect(trackFill().style.width).toBe(fillWidth(3.6))
    expect(thumbFill()).toBe(0.72)
  })

  it('rates by dragging or clicking the bar, snapped to one decimal and kept within 0.1 and 5, pouring above', async () => {
    const changes = vi.fn()
    await mount(<Controlled initial={0.5} onChange={changes} />)
    vi.spyOn(barEl(), 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: bar.width, height: bar.height } as DOMRect)
    fireEvent.pointerDown(barEl(), { clientX: xOnBar(2.15), pointerId: 1 })
    expect(changes).toHaveBeenLastCalledWith(2.2)
    expect(glassFillsAbove()).toEqual(['1', '1', '0.2', '0', '0'])
    fireEvent.pointerMove(barEl(), { clientX: xOnBar(4.04), pointerId: 1 })
    expect(changes).toHaveBeenLastCalledWith(4)
    fireEvent.pointerMove(barEl(), { clientX: -50, pointerId: 1 })
    expect(changes).toHaveBeenLastCalledWith(0.1)
    fireEvent.pointerMove(barEl(), { clientX: 9999, pointerId: 1 })
    expect(changes).toHaveBeenLastCalledWith(5)
    fireEvent.pointerUp(barEl(), { pointerId: 1 })
    // Released: moving over it no longer rates.
    fireEvent.pointerMove(barEl(), { clientX: xOnBar(1), pointerId: 1 })
    expect(changes).toHaveBeenCalledTimes(4)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '5')
    // A click elsewhere sets the score too.
    fireEvent.pointerDown(barEl(), { clientX: xOnBar(1.3), pointerId: 2 })
    fireEvent.pointerUp(barEl(), { pointerId: 2 })
    expect(changes).toHaveBeenLastCalledWith(1.3)
    expect(thumb().style.left).toBe(thumbLeft(1.3))
  })

  it('follows the keyboard and a drag of the bottle', async () => {
    await mount(<Controlled initial={2} />)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'PageUp' })
    expect(thumb().style.left).toBe(thumbLeft(2.5))
    expect(thumbFill()).toBe(0.5)
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 360, height: 200 } as DOMRect)
    fireEvent.pointerDown(slider, { clientX: xOnBottle(4), pointerId: 1 })
    expect(thumb().style.left).toBe(thumbLeft(4))
    expect(trackFill().style.width).toBe(fillWidth(4))
    expect(thumbFill()).toBe(0.8)
  })

  it('counts as touching the control: the hint and the demo go, and one lesson is recorded', async () => {
    vi.useFakeTimers()
    await mount(<Controlled />)
    act(() => { vi.advanceTimersByTime(UNCORK_MS + 50) })
    expect(screen.getByText('Drag the bottle or the bar to rate')).toBeInTheDocument()
    expect(screen.queryByTestId('pour-ghost')).not.toBeNull()
    vi.spyOn(barEl(), 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: bar.width, height: bar.height } as DOMRect)
    fireEvent.pointerDown(barEl(), { clientX: xOnBar(1), pointerId: 1 })
    fireEvent.pointerMove(barEl(), { clientX: xOnBar(2), pointerId: 1 })
    expect(screen.queryByText('Drag the bottle or the bar to rate')).toBeNull()
    expect(screen.queryByTestId('pour-ghost')).toBeNull()
    expect(barGhost()).toBeNull()
    expect(ratingGestureStorage.readCount()).toBe(1)
  })

  it('glides a see-through glass along the bar with the drag demo, then it goes', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    await mount(<PourRating value={0} onChange={onChange} wineType="white" />)
    // It waits for the bottle to uncork itself, like the bottle demo.
    expect(barGhost()).toBeNull()
    act(() => { vi.advanceTimersByTime(UNCORK_MS + 50) })
    expect(barGhost()).toHaveAttribute('aria-hidden', 'true')
    const ghostThumb = () => barGhost()!.querySelector<HTMLElement>('.vp-bar-thumb')!
    const ghostLeft = () => parseFloat(ghostThumb().style.left)
    const rest = barThumbLeft(0, layout, bar)
    expect(ghostLeft()).toBeCloseTo(rest, 1)
    act(() => { vi.advanceTimersByTime(GHOST_FADE_IN_MS + GHOST_SLIDE_MS * 0.75) })
    // It moves right with the demo bottle and its faint wine track follows it.
    expect(ghostLeft()).toBeGreaterThan(rest + 10)
    expect(parseFloat(barGhost()!.querySelector<HTMLElement>('.vp-bar-fill')!.style.width)).toBeGreaterThan(10)
    expect(Number(ghostThumb().querySelector('.vinnot-glass')!.getAttribute('data-fill'))).toBeGreaterThan(0)
    // The real glass stays put and empty.
    expect(thumb().style.left).toBe(`${rest}px`)
    expect(thumbFill()).toBe(0)
    act(() => { vi.advanceTimersByTime(GHOST_CYCLE_MS * 2) })
    expect(barGhost()).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('lines the glass up with the glasses above: 1.0 under the first glass centre, 5.0 under the last', async () => {
    const centre = async (value: number) => {
      const view = await mount(<PourRating value={value} onChange={() => {}} wineType="white" />)
      const x = parseFloat(thumb().style.left) + bar.glassWidth / 2
      view.unmount()
      return x
    }
    expect(await centre(1)).toBeCloseTo(glassCentre(0), 3)
    expect(await centre(5)).toBeCloseTo(glassCentre(4), 3)
    // Full: the wine track fills the whole track, ending under the last glass.
    await mount(<PourRating value={5} onChange={() => {}} wineType="white" />)
    expect(parseFloat(trackFill().style.width)).toBeCloseTo(bar.trackWidth, 3)
  })

  it('gives 5 for a pointer at the last glass centre', async () => {
    const changes = vi.fn()
    await mount(<Controlled initial={0.5} onChange={changes} />)
    vi.spyOn(barEl(), 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: bar.width, height: bar.height } as DOMRect)
    fireEvent.pointerDown(barEl(), { clientX: glassCentre(4), pointerId: 1 })
    expect(changes).toHaveBeenLastCalledWith(5)
    expect(glassFillsAbove()).toEqual(['1', '1', '1', '1', '1'])
  })

  it('shows no demo glass with reduced motion', async () => {
    reduceMotion()
    await mount(<PourRating value={0} onChange={() => {}} />)
    expect(barGhost()).toBeNull()
  })

  it('shows the score at the right end of the bar, outside the hidden bar, a bit larger than before', async () => {
    await mount(<PourRating value={3.6} onChange={() => {}} wineType="white" />)
    const score = screen.getByTestId('pour-score')
    const row = score.closest('.vinnot-pour-bar-row')
    expect(row).not.toBeNull()
    expect(barEl().parentElement).toBe(row)
    expect(barEl().nextElementSibling).toBe(score)
    expect(score.closest('[data-testid="pour-bar"]')).toBeNull()
    expect(score.closest('[role="slider"]')).toBeNull()
    expect(score).toHaveTextContent('3.6/ 5')
    // Centred on the track of the bar.
    expect((row as HTMLElement).style.getPropertyValue('--vp-bar-track-mid')).toBe(`${bar.trackTop + 2.5}px`)
    // The slider still says the score to assistive tech.
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '3.6 of 5')
  })

  it('stays out of assistive tech: hidden, not focusable, and only one slider is announced', async () => {
    await mount(<PourRating value={2} onChange={() => {}} />)
    expect(barEl()).toHaveAttribute('aria-hidden', 'true')
    expect(barEl()).not.toHaveAttribute('tabindex')
    expect(barEl().querySelector('[tabindex]')).toBeNull()
    expect(screen.getAllByRole('slider')).toHaveLength(1)
  })

  it('says the new hint in Spanish', async () => {
    await mount(<PourRating value={0} onChange={() => {}} />, 'es-AR')
    expect(screen.getByText('Deslizá la botella o la barra para puntuar')).toBeInTheDocument()
  })

  it('does not change while disabled, and is dimmed', async () => {
    const onChange = vi.fn()
    await mount(<PourRating value={3} onChange={onChange} disabled />)
    expect(barEl()).toHaveAttribute('data-disabled', 'true')
    fireEvent.pointerDown(barEl(), { clientX: 10, pointerId: 1 })
    fireEvent.pointerMove(barEl(), { clientX: 200, pointerId: 1 })
    expect(onChange).not.toHaveBeenCalled()
  })
})
