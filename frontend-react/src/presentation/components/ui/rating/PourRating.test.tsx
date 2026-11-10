import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { PourRating } from './PourRating'
import {
  POUR_GLASS_HEIGHT,
  RIM_ENTRY,
  bottlePose,
  bottleStage,
  bottleWineClip,
  corkBox,
  glassLeft,
  pourLayout,
  ratingAtX,
  GHOST_CYCLE_MS,
  GHOST_FADE_IN_MS,
  GHOST_SLIDE_MS,
  GHOST_TARGET,
  UNCORK_MS,
  barXAtRating,
  ghostFrame,
  standPose,
  uncorkScene,
  wineSurfaceY,
} from './pourGeometry'
import { BOTTLE_ART, ratingLook } from './ratingLook'
import { ratingGestureStorage } from '@/infrastructure/storage/ratingGesture.storage'

async function mount(ui: React.ReactElement, lng: 'en-US' | 'es-AR' = 'en-US') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

function Controlled({ initial = 3.6, onChange }: { initial?: number; onChange?: (value: number) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <PourRating value={value} onChange={(next) => { setValue(next); onChange?.(next) }} wineType="white" />
      <button type="button" onClick={() => setValue(0)}>reset</button>
    </>
  )
}

/** Points of a `polygon(...)` clip, in pixels. */
function clipPoints(clip: string): [number, number][] {
  const pairs = clip.replace(/^polygon\(|\)$/g, '').split(',')
  return pairs.map((pair) => pair.trim().split(/\s+/).map((n) => parseFloat(n)) as [number, number])
}

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

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
})

const layout = pourLayout(POUR_GLASS_HEIGHT.md, ratingLook('white'))
// A hair past the exact spot, so float noise cannot round a .x5 score down.
const xFor = (score: number) => layout.side + (score / 5) * layout.inner + 1e-6

describe('PourRating', () => {
  it('is a slider from 0.1 to 5 with the big score readout', async () => {
    await mount(<PourRating value={3.6} onChange={() => {}} label="Your rating" />)
    const slider = screen.getByRole('slider', { name: 'Your rating' })
    expect(slider).toHaveAttribute('aria-valuemin', '0.1')
    expect(slider).toHaveAttribute('aria-valuemax', '5')
    expect(slider).toHaveAttribute('aria-valuenow', '3.6')
    expect(slider).toHaveAttribute('aria-valuetext', '3.6 of 5')
    expect(screen.getByTestId('pour-score')).toHaveTextContent('3.6/ 5')
    expect(slider.querySelectorAll('.vinnot-glass')).toHaveLength(5)
  })

  it('reads the score with a decimal comma in Spanish and says when nothing is rated', async () => {
    const view = await mount(<PourRating value={3.6} onChange={() => {}} />, 'es-AR')
    expect(screen.getByRole('slider', { name: 'Puntuación' })).toHaveAttribute('aria-valuetext', '3,6 de 5')
    view.unmount()
    await mount(<PourRating value={0} onChange={() => {}} />, 'es-AR')
    const slider = screen.getByRole('slider')
    expect(slider).not.toHaveAttribute('aria-valuenow')
    expect(slider).toHaveAttribute('aria-valuetext', 'Sin puntuación')
    expect(screen.getByTestId('pour-score')).toHaveTextContent('0,0/ 5')
  })

  it('moves with arrows ±0.1, Page Up/Down ±0.5, Home and End, within 0.1 and 5', async () => {
    const changes = vi.fn()
    await mount(<Controlled onChange={changes} />)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    fireEvent.keyDown(slider, { key: 'ArrowUp' })
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    fireEvent.keyDown(slider, { key: 'ArrowDown' })
    fireEvent.keyDown(slider, { key: 'PageUp' })
    fireEvent.keyDown(slider, { key: 'PageDown' })
    fireEvent.keyDown(slider, { key: 'End' })
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    fireEvent.keyDown(slider, { key: 'Home' })
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    fireEvent.keyDown(slider, { key: 'Tab' })
    expect(changes.mock.calls.map(([value]) => value)).toEqual([3.7, 3.8, 3.7, 3.6, 4.1, 3.6, 5, 0.1])
    expect(slider).toHaveAttribute('aria-valuenow', '0.1')
  })

  it('snaps a pointer on the glasses to one decimal (2.15 → 2.2) and follows a drag', async () => {
    const changes = vi.fn()
    await mount(<Controlled initial={0.5} onChange={changes} />)
    const slider = screen.getByRole('slider')
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 360, height: 200 } as DOMRect)
    fireEvent.pointerDown(slider, { clientX: xFor(2.15), pointerId: 1 })
    expect(changes).toHaveBeenLastCalledWith(2.2)
    fireEvent.pointerMove(slider, { clientX: xFor(4.04), pointerId: 1 })
    expect(changes).toHaveBeenLastCalledWith(4)
    fireEvent.pointerMove(slider, { clientX: 9999, pointerId: 1 })
    expect(changes).toHaveBeenLastCalledWith(5)
    fireEvent.pointerUp(slider, { pointerId: 1 })
    fireEvent.pointerMove(slider, { clientX: xFor(1), pointerId: 1 })
    expect(changes).toHaveBeenCalledTimes(3)
    expect(Array.from(slider.querySelectorAll('.vinnot-glass')).map((glass) => glass.getAttribute('data-fill'))).toEqual(['1', '1', '1', '1', '1'])
  })

  it('pours while the score rises, then lifts the bottle', async () => {
    vi.useFakeTimers()
    await mount(<Controlled initial={2} />)
    const slider = screen.getByRole('slider')
    const bottle = () => slider.querySelector<HTMLImageElement>('.vp-bottle')!
    expect(bottle().style.rotate).toBe('62deg')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(bottle().style.rotate).toBe('118deg')
    expect(slider.querySelector('.vp-stream')).toHaveAttribute('data-pouring', 'true')
    act(() => { vi.advanceTimersByTime(300) })
    expect(bottle().style.rotate).toBe('62deg')
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(bottle().style.rotate).toBe('62deg')
  })

  it('uncorks itself on its stand when it opens unrated, like the AI scene, before any score', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    await mount(<PourRating value={0} onChange={onChange} wineType="white" />)
    const slider = screen.getByRole('slider')
    const bottle = () => slider.querySelector<HTMLElement>('.vp-bottle')!
    const cork = () => slider.querySelector<HTMLElement>('.vp-cork')
    const stand = standPose(layout)
    expect(bottle()).toHaveAttribute('data-corked', 'true')
    expect(bottle().style.left).toBe(`${stand.left}px`)
    expect(bottle().style.rotate).toBe('0deg')
    expect(cork()!.style.opacity).toBe('1')
    // The corkscrew turns in while the bottle waits on its stand.
    act(() => { vi.advanceTimersByTime(Math.round(UNCORK_MS * 0.25)) })
    expect(slider.querySelector<HTMLElement>('.vp-screw')!.style.opacity).toBe('1')
    expect(bottle().style.left).toBe(`${stand.left}px`)
    // Then it pulls the cork out.
    act(() => { vi.advanceTimersByTime(Math.round(UNCORK_MS * 0.5)) })
    expect(cork()!.style.transform).toMatch(/translate\(0px, -\d/)
    // Open, it stays upright on its stand: no lift until the first score, and nothing is rated.
    act(() => { vi.advanceTimersByTime(UNCORK_MS) })
    expect(cork()).toBeNull()
    expect(bottle()).toHaveAttribute('data-corked', 'false')
    expect(bottle()).not.toHaveAttribute('data-travel')
    expect(bottle().style.left).toBe(`${stand.left}px`)
    expect(bottle().style.rotate).toBe('0deg')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not uncork on its own while disabled or when it opens rated', async () => {
    vi.useFakeTimers()
    const disabled = await mount(<PourRating value={0} onChange={() => {}} disabled />)
    act(() => { vi.advanceTimersByTime(UNCORK_MS * 2) })
    expect(screen.getByRole('slider').querySelector('.vp-bottle')).toHaveAttribute('data-corked', 'true')
    expect(screen.getByRole('slider').querySelector<HTMLElement>('.vp-cork')!.style.opacity).toBe('1')
    disabled.unmount()
    // Editing a review: open already, over the glasses, with no uncorking.
    await mount(<PourRating value={3.6} onChange={() => {}} />)
    const slider = screen.getByRole('slider')
    expect(slider.querySelector('.vp-cork')).toBeNull()
    expect(slider.querySelector('.vp-bottle')).toHaveAttribute('data-corked', 'false')
    expect(slider.querySelector<HTMLElement>('.vp-bottle')!.style.left).not.toBe(`${standPose(layout).left}px`)
  })

  it('pours the first score at once once open, from the bottle or the bar', async () => {
    vi.useFakeTimers()
    const view = await mount(<Controlled initial={0} />)
    act(() => { vi.advanceTimersByTime(UNCORK_MS + 50) })
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    // No uncorking to wait for: the glass fills in step and the bottle is lifted over the glasses.
    expect(slider.querySelector('.vinnot-glass')).toHaveAttribute('data-fill', '0.1')
    expect(slider.querySelector('.vp-bottle')).toHaveAttribute('data-travel', 'lift')
    view.unmount()
    await mount(<Controlled initial={0} />)
    act(() => { vi.advanceTimersByTime(UNCORK_MS + 50) })
    const bar = screen.getByTestId('pour-bar')
    vi.spyOn(bar, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 400, height: 38 } as DOMRect)
    fireEvent.pointerDown(bar, { clientX: barXAtRating(2.2, layout) + 1e-6, pointerId: 1 })
    expect([...screen.getByRole('slider').querySelectorAll('.vinnot-glass')].map((glass) => glass.getAttribute('data-fill')))
      .toEqual(['1', '1', '0.2', '0', '0'])
  })

  it('finishes the uncorking at once when touched meanwhile, and pours the first score with no wait', async () => {
    vi.useFakeTimers()
    await mount(<Controlled initial={0} />)
    const slider = screen.getByRole('slider')
    act(() => { vi.advanceTimersByTime(300) })
    expect(slider.querySelector('.vp-cork')).not.toBeNull()
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(slider.querySelector('.vp-cork')).toBeNull()
    expect(slider.querySelector('.vp-bottle')).toHaveAttribute('data-corked', 'false')
    expect(slider.querySelector('.vinnot-glass')).toHaveAttribute('data-fill', '0.1')
    expect(slider.querySelector('.vp-bottle')).toHaveAttribute('data-travel', 'lift')
  })

  it('finishes the uncorking on a touch that does not rate too', async () => {
    vi.useFakeTimers()
    await mount(<PourRating value={0} onChange={() => {}} />)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'Tab' })
    expect(slider.querySelector('.vp-cork')).toBeNull()
    expect(slider.querySelector<HTMLElement>('.vp-bottle')!.style.left).toBe(`${standPose(layout).left}px`)
  })

  it('keeps a corked sparkling bottle under its wire cage, with no corkscrew', async () => {
    await mount(<PourRating value={0} onChange={() => {}} wineType="sparkling" />)
    const bottle = screen.getByRole('slider').querySelector('.vp-bottle')!
    expect(bottle.querySelector<HTMLElement>('.vp-cage')!.style.opacity).toBe('1')
    expect(bottle.querySelector('.vp-cork')).toHaveAttribute('src', expect.stringContaining('cork-sparkling'))
    expect(bottle.querySelector('.vp-screw')).toBeNull()
    expect(bottle.querySelectorAll('.vp-foam')).toHaveLength(6)
  })

  it('puts the cork back when the form resets to not rated', async () => {
    vi.useFakeTimers()
    await mount(<Controlled initial={2} />)
    const slider = screen.getByRole('slider')
    expect(slider.querySelector('.vp-cork')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'reset' }))
    act(() => { vi.advanceTimersByTime(1000) })
    expect(slider.querySelector('.vp-bottle')).toHaveAttribute('data-corked', 'true')
    expect(slider.querySelector<HTMLElement>('.vp-cork')!.style.opacity).toBe('1')
    expect(slider.querySelector<HTMLElement>('.vp-bottle')!.style.left).toBe(`${standPose(layout).left}px`)
  })

  it('starts uncorked and jumps straight to the poured state when motion is reduced', async () => {
    reduceMotion()
    await mount(<Controlled initial={0} />)
    const slider = screen.getByRole('slider')
    // Open from the start, on its stand, with no uncorking to watch.
    expect(slider.querySelector('.vp-cork')).toBeNull()
    expect(slider.querySelector('.vp-bottle')).toHaveAttribute('data-corked', 'false')
    expect(slider.querySelector<HTMLElement>('.vp-bottle')!.style.left).toBe(`${standPose(layout).left}px`)
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(slider.querySelector('.vp-cork')).toBeNull()
    expect(slider.querySelector('.vinnot-glass')).toHaveAttribute('data-fill', '0.1')
    expect(slider.querySelector<HTMLElement>('.vp-bottle')!.style.left).not.toBe(`${standPose(layout).left}px`)
  })

  it('empties the bottle as the glasses fill and fills it again as they empty', async () => {
    vi.useFakeTimers()
    await mount(<Controlled initial={2} />)
    const slider = screen.getByRole('slider')
    const full = () => slider.querySelector<HTMLElement>('.vp-full')!
    expect(slider.querySelector('.vp-empty')).toHaveAttribute('src', '/images/rating/bottle-clear-white-empty.webp')
    const atTwo = full().style.clipPath
    expect(atTwo).toMatch(/^polygon\(/)
    fireEvent.keyDown(slider, { key: 'PageUp' })
    act(() => { vi.advanceTimersByTime(300) })
    const atTwoAndHalf = full().style.clipPath
    expect(atTwoAndHalf).not.toBe(atTwo)
    fireEvent.keyDown(slider, { key: 'PageDown' })
    act(() => { vi.advanceTimersByTime(300) })
    expect(full().style.clipPath).toBe(atTwo)
  })

  it('stands the bottle back beside the glasses, open and empty, once 5.0 is poured', async () => {
    vi.useFakeTimers()
    await mount(<Controlled initial={4.9} />)
    const slider = screen.getByRole('slider')
    const bottle = () => slider.querySelector<HTMLElement>('.vp-bottle')!
    const shade = () => slider.querySelector<HTMLElement>('.vp-shade')!
    expect(shade()).toHaveAttribute('data-stand', 'false')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(bottle().style.rotate).toBe('118deg')
    act(() => { vi.advanceTimersByTime(300) })
    expect(bottle().style.left).toBe(`${standPose(layout).left}px`)
    expect(bottle().style.rotate).toBe('0deg')
    expect(bottle()).toHaveAttribute('data-corked', 'false')
    expect(slider.querySelector('.vp-cork')).toBeNull()
    // Standing, it casts a short contact shadow; no wine is left in it.
    expect(shade()).toHaveAttribute('data-stand', 'true')
    expect(bottle().querySelector<HTMLElement>('.vp-full')!.style.clipPath).toBe(bottleWineClip(0, 0, layout, ratingLook('white')))
  })

  it('does not change while disabled', async () => {
    const onChange = vi.fn()
    await mount(<PourRating value={3} onChange={onChange} disabled />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-disabled', 'true')
    expect(slider).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    fireEvent.pointerDown(slider, { clientX: 200 })
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('pour geometry', () => {
  it('leaves a stand for the upright bottle left of the glasses and makes the bottle bigger', () => {
    const stand = standPose(layout)
    const glass = POUR_GLASS_HEIGHT.md
    expect(layout.bottleHeight).toBeCloseTo(glass * 1.3)
    expect(layout.top).toBeCloseTo(glass * 0.9)
    expect(layout.height).toBe(Math.round(glass * 0.9 + glass + 8))
    expect(layout.side).toBeCloseTo(glass * 0.65 + layout.bottleWidth)
    expect(stand.left).toBeCloseTo(glass * 0.2, 1)
    expect(stand.rotate).toBe(0)
    expect(stand.top + layout.bottleHeight).toBeCloseTo(layout.top + layout.glassHeight)
    expect(stand.left).toBeGreaterThan(0)
    expect(stand.left + layout.bottleWidth).toBeLessThan(glassLeft(layout, 0))
  })

  it('is corked at 0, pours from 0.1 to 4.9 and is finished at 5.0', () => {
    expect([0, 0.1, 4.9, 5].map(bottleStage)).toEqual(['corked', 'pouring', 'pouring', 'finished'])
  })

  it('puts the cork in the bottle mouth, partly above the lip', () => {
    const look = ratingLook('red')
    const cork = corkBox(layout, look)
    expect(cork.top).toBeLessThan(0.02 * layout.bottleHeight)
    expect(cork.top + cork.height).toBeGreaterThan(0.01 * layout.bottleHeight)
    expect(cork.left + cork.width / 2).toBeCloseTo(layout.bottleWidth * (51.7 / 104), 1)
  })


  it('keeps the wine surface level: shoulder when full, base when empty, at the neck once turned over', () => {
    const [top, bottom] = BOTTLE_ART['clear-white'].wine
    const upright = (remaining: number) => wineSurfaceY(100, 0, remaining, layout, ratingLook('white'))
    const shoulder = 100 + (top - 0.5) * layout.bottleHeight
    const base = 100 + (bottom - 0.5) * layout.bottleHeight
    expect(upright(1)).toBeCloseTo(shoulder)
    expect(upright(0)).toBeCloseTo(base)
    expect(upright(0.5)).toBeCloseTo((shoulder + base) / 2)
    const tilted = (remaining: number) => wineSurfaceY(50, 118, remaining, layout, ratingLook('white'))
    expect(tilted(1)).toBeLessThan(tilted(0.5))
    expect(tilted(0.5)).toBeLessThan(tilted(0))
  })

  it('cuts the full bottle below the level line, in the bottle box of the current pose', () => {
    const look = ratingLook('white')
    const [top, bottom] = BOTTLE_ART['clear-white'].wine
    const minY = (clip: string) => Math.min(...clipPoints(clip).map(([, y]) => y))
    expect(minY(bottleWineClip(0, 1, layout, look))).toBeCloseTo(top * layout.bottleHeight, 0)
    expect(minY(bottleWineClip(0, 0, layout, look))).toBeCloseTo(bottom * layout.bottleHeight, 0)
    expect(minY(bottleWineClip(0, 0.5, layout, look))).toBeCloseTo(((top + bottom) / 2) * layout.bottleHeight, 0)
    // Upright, the cut spans the whole width and reaches the bottom of the box.
    const xs = clipPoints(bottleWineClip(0, 0.5, layout, look)).map(([x]) => x)
    expect(Math.min(...xs)).toBeCloseTo(0, 0)
    expect(Math.max(...xs)).toBeCloseTo(layout.bottleWidth, 0)
    // Turned over, what is left gathers at the neck (the top of the box).
    for (const angle of [118, 180]) {
      const points = clipPoints(bottleWineClip(angle, 0.3, layout, look))
      const meanY = points.reduce((sum, [, y]) => sum + y, 0) / points.length
      expect(meanY).toBeLessThan(layout.bottleHeight / 2)
    }
  })

  it('uncorks still wine like the AI scene: the corkscrew turns in, pulls the cork out, then all is gone', () => {
    const start = uncorkScene(0, 'still', 1)
    expect(start.cork.dy).toBeCloseTo(0)
    expect(start.cork.opacity).toBe(1)
    expect(start.screw.opacity).toBe(0)
    const turning = uncorkScene(0.25, 'still', 1)
    expect(turning.screw.opacity).toBe(1)
    expect(turning.screw.dy).toBeGreaterThan(0)
    expect(Math.abs(turning.screw.scaleX)).toBeLessThanOrEqual(1)
    const pulled = uncorkScene(0.75, 'still', 1)
    expect(pulled.cork.dy).toBeLessThan(0)
    expect(pulled.screw.dy).toBeLessThan(turning.screw.dy)
    const done = uncorkScene(1, 'still', 1)
    expect([done.cork.opacity, done.screw.opacity, done.wisp.opacity]).toEqual([0, 0, 0])
  })

  it('pops a sparkling cork: the cage comes off, the cork flies and foam wells up, then all is gone', () => {
    const start = uncorkScene(0, 'sparkling', 1)
    expect(start.cage.opacity).toBe(1)
    expect(start.cork.dy).toBeCloseTo(0)
    expect(start.cork.opacity).toBe(1)
    const flying = uncorkScene(0.7, 'sparkling', 1)
    expect(flying.cage.opacity).toBe(0)
    expect(flying.cork.dy).toBeLessThan(-30)
    expect(flying.foam.opacity).toBeGreaterThan(0)
    const done = uncorkScene(1, 'sparkling', 1)
    expect([done.cork.opacity, done.cage.opacity, done.foam.opacity]).toEqual([0, 0, 0])
  })

  it('maps the horizontal position to the score', () => {
    expect(ratingAtX(layout.side, layout)).toBe(0)
    expect(ratingAtX(layout.side + layout.inner, layout)).toBeCloseTo(5)
  })

  it('places the stream from the bottle lip into the glass being filled', () => {
    const pose = bottlePose(2.5, layout, ratingLook('white'), true)
    expect(pose.rotate).toBe(118)
    expect(pose.stream).toMatch(/^M\d+(\.\d)?,\d+(\.\d)? Q/)
    expect(bottlePose(0, layout, ratingLook('red'), false).rotate).toBe(62)
  })

  it('pours in over the left rim of the glass being filled, never through its wall', () => {
    const look = ratingLook('white')
    for (const value of [0.1, 1, 2.2, 3.5, 5]) {
      const pose = bottlePose(value, layout, look, true)
      const index = Math.min(4, Math.floor(value - 1e-6))
      const [lipX = NaN, lipY = NaN, , , endX = NaN, endY = NaN] = pose.stream.match(/-?\d+(\.\d+)?/g)!.map(Number)
      const left = glassLeft(layout, index)
      expect(pose.glass).toBe(index)
      // The mouth sits just above the rim, a little inside its left end.
      expect(lipY).toBeLessThan(layout.top)
      expect((lipX - left) / layout.glassWidth).toBeCloseTo(RIM_ENTRY, 1)
      // The wine lands between the near wall and the centre of the glass.
      expect(endX).toBeGreaterThan(lipX)
      expect(endX).toBeLessThan(left + layout.glassWidth / 2)
      expect(endY).toBeGreaterThan(layout.top)
    }
  })
})

describe('PourRating guidance for new raters', () => {
  const ghost = () => screen.queryByTestId('pour-ghost')
  /** The demo waits for the bottle to uncork itself. */
  const afterUncork = () => act(() => { vi.advanceTimersByTime(UNCORK_MS + 50) })
  const ghostFills = () => [...ghost()!.querySelectorAll('.vp-ghost-glass')].map((glass) => Number(glass.getAttribute('data-fill')))

  it('shows a light hint under the glasses until a score is set, and none while disabled', async () => {
    const { unmount } = await mount(<Controlled initial={0} />)
    const hint = screen.getByText('Drag the bottle or the bar to rate')
    expect(hint).toHaveClass('text-xs', 'text-gray-500')
    expect(hint.closest('.vinnot-pour-card')).not.toBeNull()
    expect(hint.closest('[role="slider"]')).toBeNull()
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })
    expect(screen.queryByText('Drag the bottle or the bar to rate')).toBeNull()
    unmount()
    await mount(<PourRating value={0} onChange={() => {}} disabled />)
    expect(screen.queryByText('Drag the bottle or the bar to rate')).toBeNull()
  })

  it('says the hint in Spanish and keeps the slider described for screen readers', async () => {
    await mount(<PourRating value={0} onChange={() => {}} />, 'es-AR')
    expect(screen.getByText('Deslizá la botella o la barra para puntuar')).toBeInTheDocument()
    const slider = screen.getByRole('slider')
    expect(document.getElementById(slider.getAttribute('aria-describedby')!)).toHaveTextContent('Arrastrá la botella')
  })

  it('plays a decorative drag demo at 0 once the bottle is open: a see-through bottle glides over the glasses and they fill faintly', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    await mount(<PourRating value={0} onChange={onChange} wineType="white" />)
    const slider = screen.getByRole('slider')
    // Not while the bottle uncorks itself.
    act(() => { vi.advanceTimersByTime(UNCORK_MS - 100) })
    expect(ghost()).toBeNull()
    afterUncork()
    expect(ghost()).toHaveAttribute('aria-hidden', 'true')
    // The demo bottle is open too.
    expect(ghost()!.querySelector('.vp-bottle')).toHaveAttribute('data-corked', 'false')
    // The demo bottle casts no shadow: on a see-through copy it would read as haze.
    expect(ghost()!.querySelector('.vp-ghost-bottle .vp-shade')).toHaveAttribute('data-shadow', 'false')
    expect(slider.querySelector('.vp-shade')).toHaveAttribute('data-shadow', 'true')
    expect(ghostFills()).toEqual([0, 0, 0, 0, 0])
    // Halfway through the slide the preview has poured into the glasses.
    act(() => { vi.advanceTimersByTime(GHOST_FADE_IN_MS + GHOST_SLIDE_MS * 0.75) })
    expect(ghostFills()[0]).toBeGreaterThan(0)
    // The real control is untouched: open on its stand, glasses empty, nothing reported.
    expect(slider.querySelector('.vp-bottle')).toHaveAttribute('data-corked', 'false')
    expect(slider.querySelector<HTMLElement>('.vp-bottle')!.style.left).toBe(`${standPose(layout).left}px`)
    expect([...slider.querySelectorAll('.vinnot-glass')].map((glass) => glass.getAttribute('data-fill'))).toEqual(['0', '0', '0', '0', '0'])
    expect(slider).not.toHaveAttribute('aria-valuenow')
    // It drains, pauses and plays once more, then stops, never rating on its own.
    act(() => { vi.advanceTimersByTime(GHOST_CYCLE_MS * 2 - GHOST_FADE_IN_MS - GHOST_SLIDE_MS * 0.75 - 50) })
    expect(ghost()).not.toBeNull()
    act(() => { vi.advanceTimersByTime(100) })
    expect(ghost()).toBeNull()
    expect(screen.getByText('Drag the bottle or the bar to rate')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows no demo once rated, while disabled or with reduced motion', async () => {
    const rated = await mount(<PourRating value={3.6} onChange={() => {}} />)
    expect(ghost()).toBeNull()
    rated.unmount()
    const disabled = await mount(<PourRating value={0} onChange={() => {}} disabled />)
    expect(ghost()).toBeNull()
    disabled.unmount()
    reduceMotion()
    await mount(<PourRating value={0} onChange={() => {}} />)
    expect(ghost()).toBeNull()
  })

  it('hides the demo for good once the control is touched by pointer or keyboard', async () => {
    vi.useFakeTimers()
    const pointer = await mount(<PourRating value={0} onChange={() => {}} />)
    afterUncork()
    expect(ghost()).not.toBeNull()
    fireEvent.pointerDown(screen.getByRole('slider'), { clientX: 0 })
    expect(ghost()).toBeNull()
    pointer.unmount()
    await mount(<PourRating value={0} onChange={() => {}} />)
    afterUncork()
    expect(ghost()).not.toBeNull()
    // A key that does not rate still counts as a touch.
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'Tab' })
    expect(ghost()).toBeNull()
  })

  it('hides the hint as soon as the control is touched, and keeps it for those who learned the gesture', async () => {
    await mount(<PourRating value={0} onChange={() => {}} />)
    fireEvent.pointerDown(screen.getByRole('slider'), { clientX: 0 })
    expect(screen.queryByText('Drag the bottle or the bar to rate')).toBeNull()
    cleanup()
    ratingGestureStorage.writeCount(3)
    await mount(<PourRating value={0} onChange={() => {}} />)
    expect(screen.getByText('Drag the bottle or the bar to rate')).toBeInTheDocument()
    expect(ghost()).toBeNull()
  })

  it('teaches the gesture for three ratings, then never shows the demo again', async () => {
    vi.useFakeTimers()
    for (const lesson of [1, 2, 3]) {
      const opening = await mount(<Controlled initial={0} />)
      afterUncork()
      expect(ghost()).not.toBeNull()
      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })
      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })
      // One opening counts once, however many times it is rated.
      expect(ratingGestureStorage.readCount()).toBe(lesson)
      opening.unmount()
    }
    await mount(<PourRating value={0} onChange={() => {}} />)
    afterUncork()
    expect(ghost()).toBeNull()
    expect(screen.getByText('Drag the bottle or the bar to rate')).toBeInTheDocument()
  })

  it('plays the demo again each time the control opens unrated', async () => {
    vi.useFakeTimers()
    const first = await mount(<Controlled initial={0} />)
    afterUncork()
    expect(ghost()).not.toBeNull()
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })
    // Reset to not rated in the same form: it was touched, so the demo stays away.
    fireEvent.click(screen.getByRole('button', { name: 'reset' }))
    expect(ghost()).toBeNull()
    first.unmount()
    await mount(<PourRating value={0} onChange={() => {}} />)
    afterUncork()
    expect(ghost()).not.toBeNull()
  })
})

describe('drag demo timeline', () => {
  it('fades the bottle in on its stand, glides it pouring to the middle of the glasses, then fades and drains', () => {
    expect(ghostFrame(0)).toEqual({ held: 0, opacity: 0, score: 0 })
    const shown = ghostFrame(GHOST_FADE_IN_MS)
    expect(shown.opacity).toBe(1)
    expect(shown.score).toBe(0)
    const arrived = ghostFrame(GHOST_FADE_IN_MS + GHOST_SLIDE_MS)
    expect(arrived.held).toBe(1)
    expect(arrived.score).toBeCloseTo(GHOST_TARGET, 1)
    expect(GHOST_TARGET).toBe(2.5)
    const paused = ghostFrame(GHOST_CYCLE_MS - 100)
    expect(paused.opacity).toBe(0)
    expect(paused.score).toBe(0)
  })

  it('repeats every cycle', () => {
    const t = GHOST_FADE_IN_MS + GHOST_SLIDE_MS / 2
    expect(ghostFrame(t + GHOST_CYCLE_MS * 2)).toEqual(ghostFrame(t))
  })
})
