import { act, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { AiProfileLoadingSteps, AI_PROFILE_STEP_INTERVAL_MS } from '../AiProfileLoadingSteps'
import { CompareLoadingSteps, COMPARE_STEP_INTERVAL_MS } from '../CompareLoadingSteps'
import { BookOpen, Wine } from 'lucide-react'
import { AiProcessScene } from './AiProcessScene'
import { AiProcessSceneArt } from './AiProcessSceneArt'
import {
  keyframesCss,
  phase,
  SCENE_ACTION_MS,
  SCENE_SAMPLES,
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

it('keeps a step on screen for its own time when it needs longer than the others', () => {
  vi.useFakeTimers()
  render(
    <AiProcessScene
      eyebrow="Eyebrow"
      title="Title"
      subtitle="Subtitle"
      stepIntervalMs={1000}
      picks={['/art/one.webp']}
      steps={[
        { key: 'gather', label: 'Gather', icon: BookOpen, scene: 'gather', holdMs: 2500 },
        { key: 'fill', label: 'Fill', icon: Wine, scene: 'fill' },
        { key: 'paint', label: 'Paint', icon: Wine, scene: 'paint' },
      ]}
    />,
  )
  const bar = screen.getByRole('progressbar')
  act(() => vi.advanceTimersByTime(2400))
  expect(bar).toHaveAttribute('aria-valuenow', '1')
  act(() => vi.advanceTimersByTime(100))
  expect(bar).toHaveAttribute('aria-valuenow', '2')
  act(() => vi.advanceTimersByTime(1000))
  expect(bar).toHaveAttribute('aria-valuenow', '3')
  act(() => vi.advanceTimersByTime(5000))
  expect(bar).toHaveAttribute('aria-valuenow', '3')
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

/* ── Taste quiz scenes ─────────────────────────────────────────────── */

const picks = ['/art/one.webp', '/art/two.webp', '/art/three.webp', '/art/four.webp', '/art/five.webp']
const ids = (scene: AiProcessSceneName, given: readonly string[] = picks) => sceneLayers(scene, wineSceneLooks(), given).map((item) => item.id)
const find = (scene: AiProcessSceneName, id: string, given: readonly string[] = picks) => {
  const search = (layers: ReturnType<typeof sceneLayers>): ReturnType<typeof sceneLayers>[number] | undefined =>
    layers.reduce<ReturnType<typeof sceneLayers>[number] | undefined>((found, item) => found ?? (item.id === id ? item : search(item.children ?? [])), undefined)
  return search(sceneLayers(scene, wineSceneLooks(), given))!
}

const GATHER_IDS = [
  'gather-journal', 'gather-title',
  'gather-pick-0', 'gather-note-0', 'gather-pick-1', 'gather-note-1', 'gather-pick-2', 'gather-note-2',
  'gather-pick-3', 'gather-note-3', 'gather-pick-4', 'gather-note-4',
  'gather-pen',
]

/** The visible share of a layer, in percent, read from its polygon reveal mask (left edge of the box to the drawing front). */
const revealed = (pose: { 'clip-path'?: string }) => {
  const xs = [...pose['clip-path']!.matchAll(/(-?[\d.]+)% (-?[\d.]+)%/g)].map((match) => Number(match[1]))
  return Math.min(Math.max(Math.max(...xs), 0), 100)
}

/** The pen's nib on the stage, from its transform (the nib sits at the art's lower left). */
const nibAt = (transform: string, pen: { w: number; h: number }) => {
  const [, x, y] = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(transform)!.map(Number)
  return { x: x! + 0.06 * pen.w, y: y! + 0.99 * pen.h }
}

/** Progress at which pick `index` is half drawn. */
const midDraw = (index: number) => 0.03 + index * 0.18 + 0.05

it('lays the picks out on the flat journal like a tasting entry, inside the page margins and clear of the ribbon', () => {
  expect(ids('gather')).toEqual(GATHER_IDS)
  const journal = find('gather', 'gather-journal')
  expect(journal.src).toContain('journal-flat')
  // The journal fills most of the stage.
  expect(journal.w).toBeGreaterThan(108)
  expect(picks.map((_, index) => find('gather', `gather-pick-${index}`).src)).toEqual(picks)
  const left = [journal.x + 0.081 * journal.w, journal.x + 0.478 * journal.w]
  const right = [journal.x + 0.525 * journal.w, journal.x + 0.908 * journal.w]
  const top = journal.y + 0.05 * journal.h
  const bottom = journal.y + 0.825 * journal.h
  picks.forEach((_, index) => {
    const pick = find('gather', `gather-pick-${index}`)
    const note = find('gather', `gather-note-${index}`)
    const [from, to] = index < 2 ? left : right
    for (const item of [pick, note]) {
      expect(item.x).toBeGreaterThanOrEqual(from!)
      expect(item.x + item.w).toBeLessThanOrEqual(to!)
      expect(item.y).toBeGreaterThanOrEqual(top)
      expect(item.y + item.h).toBeLessThanOrEqual(bottom)
    }
    // The note sits beside its sketch, on the same row.
    expect(note.x).toBeGreaterThanOrEqual(pick.x + pick.w)
    expect(note.y).toBeGreaterThan(pick.y)
    expect(note.y + note.h).toBeLessThan(pick.y + pick.h)
  })
  expect(ids('gather', picks.slice(0, 2))).toEqual([...GATHER_IDS.slice(0, 6), 'gather-pen'])
  expect(ids('gather', [...picks, '/art/six.webp'])).toEqual(GATHER_IDS)
  // Without picks the page keeps its title and the pen just leaves.
  expect(ids('gather', [])).toEqual(['gather-journal', 'gather-title', 'gather-pen'])
  expect(find('gather', 'gather-pen', []).track!(0).transform).toBe(find('gather', 'gather-pen', []).track!(0.5).transform)
})

it('blends the sketches and the notes into the paper as ink and watercolor, never as stickers', () => {
  const layers = sceneLayers('gather', wineSceneLooks(), picks)
  for (const id of ['gather-title', ...picks.flatMap((_, index) => [`gather-pick-${index}`, `gather-note-${index}`])]) {
    const item = layers.find((candidate) => candidate.id === id)!
    // Blended at the top level, so nothing isolates them from the page.
    expect(item.blend).toBe('multiply')
  }
  const pick = find('gather', 'gather-pick-1')
  // Drawn in sepia ink first, then warming to full color, slightly see-through; no drop shadow anywhere.
  expect(pick.track!(midDraw(1)).filter).toMatch(/^sepia\(0\.[1-9]/)
  expect(pick.track!(1).filter).toBe('sepia(0) saturate(1)')
  expect(Number(pick.track!(1).opacity)).toBeLessThan(1)
  expect(Number(pick.track!(1).opacity)).toBeGreaterThan(0.75)
  const filters = layers.flatMap((item) => (item.track ? [0, 0.5, 1].map((p) => item.track!(p).filter ?? '') : []))
  expect(filters.join(' ')).not.toContain('drop-shadow')
  // A slight page-aligned tilt at most.
  picks.forEach((_, index) => {
    const tilt = Number(/rotate\((-?[\d.]+)deg\)/.exec(find('gather', `gather-pick-${index}`).track!(1).transform!)![1])
    expect(Math.abs(tilt)).toBeLessThanOrEqual(4)
  })
})

it('draws each pick in place where the pen passes, then writes its note, one after another', () => {
  const first = find('gather', 'gather-pick-0').track!
  const last = find('gather', 'gather-pick-4').track!
  // Nothing moves in from outside: a sketch never travels, it is revealed in place.
  for (const p of [0, 0.1, 0.5, 1]) expect(first(p).transform).toBe(first(1).transform)
  expect(revealed(first(0))).toBe(0)
  expect(revealed(first(midDraw(0)))).toBeGreaterThan(20)
  expect(revealed(first(midDraw(0)))).toBeLessThan(100)
  // The hand eases into the drawing instead of dashing: early on, far less is drawn than at an even pace.
  expect(revealed(first(0.04))).toBeLessThan(8)
  expect(revealed(first(1))).toBe(100)
  // One after another: the last sketch is still blank when the first is finished.
  expect(revealed(first(0.2))).toBe(100)
  expect(revealed(last(0.2))).toBe(0)
  // The note is written after its sketch, left to right.
  const note = find('gather', 'gather-note-0').track!
  expect(note(midDraw(0))['clip-path']).toBe('inset(0 100% 0 0)')
  expect(note(0.2)['clip-path']).toBe('inset(0 0% 0 0)')
  // The pen's nib is on the drawing while the sketch appears, then on the note line while it is written.
  const pen = find('gather', 'gather-pen')
  for (let index = 0; index < picks.length; index++) {
    const pick = find('gather', `gather-pick-${index}`)
    const nib = nibAt(pen.track!(midDraw(index)).transform!, pen)
    const front = (revealed(pick.track!(midDraw(index))) / 100) * pick.w
    expect(nib.x).toBeGreaterThanOrEqual(pick.x - 1)
    expect(nib.x).toBeLessThanOrEqual(pick.x + front + 1)
    expect(nib.y).toBeGreaterThanOrEqual(pick.y - 1)
    expect(nib.y).toBeLessThanOrEqual(pick.y + pick.h + 1)
    const line = find('gather', `gather-note-${index}`)
    const writing = nibAt(pen.track!(0.03 + index * 0.18 + 0.135).transform!, pen)
    expect(writing.x).toBeGreaterThan(line.x)
    expect(writing.x).toBeLessThan(line.x + line.w)
    expect(Math.abs(writing.y - (line.y + line.h / 2))).toBeLessThan(2)
  }
  // The pen is there from the start and leaves when the page is done.
  expect(pen.track!(0).opacity).toBe('1')
  expect(pen.track!(1).opacity).toBe('0')
})

it('crops each note to a single handwritten line and keeps the title written on the page', () => {
  const note = find('gather', 'gather-note-2')
  expect(note.clip).toBe(true)
  const ink = note.children![0]!
  expect(ink.src).toContain('handwriting')
  // One line of the handwriting art, shifted so only that line shows.
  expect(ink.y).toBeLessThan(0)
  expect(note.h).toBeLessThan(ink.h / 4)
  const title = find('gather', 'gather-title')
  expect(title.track).toBeUndefined()
  expect(title.opacity).toBeLessThan(1)
  expect(title.children![0]!.src).toContain('handwriting')
  expect(title.children![0]!.y).toBe(0)
})

it('samples the drawing finely enough for the pen strokes, keeping the other scenes as they were', () => {
  expect(sceneTiming(1000, false).points).toHaveLength(41)
  expect(sceneTiming(1000, false, SCENE_SAMPLES.gather).points.length).toBeGreaterThan(150)
  expect(SCENE_SAMPLES.report).toBe(40)
  expect(SCENE_ACTION_MS.gather).toBeGreaterThanOrEqual(2000)
})

it('fills an empty glass with red wine early, then lets three aroma wisps rise from it, with no cut-out picks', () => {
  expect(ids('fill')).toEqual(['fill-glass', 'fill-wisp-0', 'fill-wisp-1', 'fill-wisp-2'])
  const layers = sceneLayers('fill', wineSceneLooks(), picks)
  const sources = (items: typeof layers): string[] => items.flatMap((item) => [item.src ?? '', ...sources(item.children ?? [])])
  picks.forEach((pick) => expect(sources(layers)).not.toContain(pick))
  expect(find('fill', 'fill-glass').src).toContain('glass-red')
  expect(find('fill', 'fill-glass-red').src).toContain('wine-red')
  // The wine starts rising early and the glass is full by the end.
  const wine = find('fill', 'fill-glass-wine').track!
  expect(wine(0.05)).toEqual(wine(0))
  expect(wine(0.15)['clip-path']).not.toBe(wine(0)['clip-path'])
  expect(wine(1)['clip-path']).toBe(wine(0.6)['clip-path'])
  // The wisps appear one after another once the glass is full, rising above the rim.
  const wisps = [0, 1, 2].map((index) => find('fill', `fill-wisp-${index}`))
  wisps.forEach((wisp, index) => {
    expect(wisp.src).toContain(`wisp-${index + 1}`)
    expect(wisp.track!(0.4).opacity).toBe('0')
    expect(Number(wisp.track!(1).opacity)).toBeGreaterThan(0.7)
    expect(wisp.track!(1).transform).toBe('translateY(-6px)')
  })
  expect(wisps[2]!.track!(0.55).opacity).toBe('0')
  expect(Number(wisps[0]!.track!(0.55).opacity)).toBeGreaterThan(0)
})

it('centers the main piece of every quiz scene on the round stage', () => {
  // The palette disc's own centre, measured on the art, sits on the centre of the stage; the brush may reach outside it.
  const palette = find('blend', 'blend-palette')
  expect(palette.x + 0.498 * palette.w).toBeCloseTo(64, 0)
  expect(palette.y + 0.498 * palette.h).toBeCloseTo(64, 0)
  const journal = find('gather', 'gather-journal')
  expect(journal.x + 0.499 * journal.w).toBeCloseTo(64, 0)
  expect(journal.y + 0.498 * journal.h).toBeCloseTo(64, 0)
  // The glass stands centred across; it sits low so the rising aromas fit above it.
  const glass = find('fill', 'fill-glass')
  expect(glass.x + 0.498 * glass.w).toBeCloseTo(64, 0)
  const wheel = find('paint', 'paint-glass')
  expect(wheel.x + wheel.w / 2).toBeCloseTo(64, 0)
  expect(wheel.y + wheel.h / 2).toBeCloseTo(64, 0)
})

it('dips the brush into the palette wells and swirls the colors together', () => {
  expect(ids('blend')).toEqual(['blend-palette', 'blend-blot-0', 'blend-blot-1', 'blend-brush'])
  expect(find('blend', 'blend-palette').src).toContain('palette')
  expect(find('blend', 'blend-brush').src).toContain('brush')
  const blot = find('blend', 'blend-blot-0')
  expect(blot.shape).toBe('blot')
  expect(blot.track!(0).opacity).toBe('0')
  expect(Number(blot.track!(1).opacity)).toBeGreaterThan(0.5)
  const brush = find('blend', 'blend-brush').track!
  expect(brush(0.15).transform).not.toBe(brush(0.55).transform)
  expect(brush(0.35).transform).not.toBe(brush(0.4).transform)
})

it('paints the six petals of the taste wheel one by one around a glass of red wine seen from above', () => {
  expect(ids('paint')).toEqual([
    'paint-petal-0', 'paint-petal-1', 'paint-petal-2', 'paint-petal-3', 'paint-petal-4', 'paint-petal-5', 'paint-glass', 'paint-glass-swirl', 'paint-brush',
  ])
  const colors = ['ruby', 'rose', 'gold', 'sage', 'violet', 'amber']
  colors.forEach((color, index) => expect(find('paint', `paint-petal-${index}`).src).toContain(`petal-${color}`))
  const glass = find('paint', 'paint-glass')
  expect(glass.src).toContain('glass-top')
  expect(glass.src).not.toContain('garnet')
  expect(glass.x + glass.w / 2).toBeCloseTo(64, 1)
  expect(glass.y + glass.h / 2).toBeCloseTo(64, 0)
  expect(sceneLayers('paint', wineSceneLooks()).some((item) => item.src?.includes('grape-cluster'))).toBe(false)
  // Once the wheel is painted the wine swirls; it is still again when the wheel is painted anew.
  const swirl = find('paint', 'paint-glass-swirl')
  expect(swirl.src).toContain('glass-top-garnet')
  expect(swirl.track!(0.3).opacity).toBe('0')
  expect(swirl.track!(1).opacity).toBe('1')
  expect(swirl.track!(1.25).opacity).toBe('0')
  const second = find('paint', 'paint-petal-1').track!
  expect(second(0)['clip-path']).toBe('inset(100% 0 0 0)')
  expect(second(1)['clip-path']).toBe('inset(0% 0 0 0)')
  expect(second(1).transform).toContain('rotate(60deg)')
  expect(find('paint', 'paint-petal-5').track!(1).transform).toContain('rotate(300deg)')
  // One by one: the last petal waits while the first is being painted.
  expect(find('paint', 'paint-petal-5').track!(0.15)['clip-path']).toBe('inset(100% 0 0 0)')
  // While the answer is pending, the petals fade so the wheel can be painted again.
  expect(second(1.25).opacity).toBe('0')
})

it('rotates each petal around its pointed end, which rests just outside the rim of the glass', () => {
  const petal = find('paint', 'paint-petal-2')
  const glass = find('paint', 'paint-glass')
  const match = /translate\((-?[\d.]+)px, (-?[\d.]+)px\) translate\((-?[\d.]+)px, (-?[\d.]+)px\) rotate\(120deg\) scale\(1\)/.exec(
    petal.track!(1).transform!,
  )!
  const [ox, oy, dx, dy] = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])]
  // The pointed end (bottom centre of the art) relative to the layer centre, rotated by 120° and moved back.
  const pivot = { x: 0.485 * petal.w - petal.w / 2, y: 0.975 * petal.h - petal.h / 2 }
  const angle = (120 * Math.PI) / 180
  const tipX = petal.x + petal.w / 2 + ox + dx + pivot.x * Math.cos(angle) - pivot.y * Math.sin(angle)
  const tipY = petal.y + petal.h / 2 + oy + dy + pivot.x * Math.sin(angle) + pivot.y * Math.cos(angle)
  // Along the petal's own direction (120° clockwise from up), a small gap past the rim.
  const distance = Math.hypot(tipX - 64, tipY - 64)
  expect(Math.atan2(tipX - 64, -(tipY - 64))).toBeCloseTo(angle, 2)
  expect(distance - glass.w / 2).toBeGreaterThan(1)
  expect(distance - glass.w / 2).toBeLessThan(4)
  // The painted wheel stays inside the round stage.
  expect(distance + petal.h).toBeLessThan(64)
})

it('loops the wheel painting on the last step and holds the painted wheel with reduced motion', () => {
  const { unmount } = render(<AiProcessSceneArt scene="paint" looks={wineSceneLooks()} picks={picks} waiting reducedMotion={false} />)
  expect(document.querySelector('[data-scene="paint"]')).toHaveAttribute('data-motion', 'replay')
  expect(layer('paint-brush')!.getAttribute('style')).toContain('infinite')
  unmount()
  render(<AiProcessSceneArt scene="paint" looks={wineSceneLooks()} picks={picks} waiting reducedMotion />)
  expect(document.querySelector('style')).toBeNull()
  expect(layer('paint-petal-3')!.style.clipPath).toBe('inset(0% 0 0 0)')
  expect(layer('paint-petal-3')!.style.transform).toContain('rotate(180deg)')
})

it('draws the picks the scene is given and the palette blots as watercolor drops', () => {
  const still = render(<AiProcessSceneArt scene="gather" looks={wineSceneLooks()} picks={picks} waiting={false} reducedMotion />)
  // Reduced motion shows the finished page: every sketch and note drawn, in color, blended, and no pen.
  expect(layer('gather-pick-3')!.querySelector('img')).toHaveAttribute('src', picks[3])
  expect(layer('gather-pick-3')!.style.mixBlendMode).toBe('multiply')
  expect(layer('gather-pick-3')!.style.filter).toBe('sepia(0) saturate(1)')
  expect(layer('gather-pick-3')!.style.clipPath).toContain('polygon(')
  expect(layer('gather-note-3')!.style.clipPath).toBe('inset(0 0% 0 0)')
  expect(Number(layer('gather-title')!.style.opacity)).toBeLessThan(1)
  expect(layer('gather-pen')!.style.opacity).toBe('0')
  still.unmount()
  const moving = render(<AiProcessSceneArt scene="gather" looks={wineSceneLooks()} picks={picks} waiting={false} reducedMotion={false} />)
  expect(layer('gather-pick-0')!.getAttribute('style')).toContain(`${SCENE_ACTION_MS.gather}ms`)
  expect(layer('gather-pick-0')!.style.mixBlendMode).toBe('multiply')
  moving.unmount()
  render(<AiProcessSceneArt scene="blend" looks={wineSceneLooks()} waiting reducedMotion={false} />)
  expect(layer('blend-blot-1')!.style.borderRadius).toBe('50%')
  expect(layer('blend-blot-1')!.style.backgroundColor).not.toBe('')
  expect(document.querySelector('[data-scene="blend"]')).toHaveAttribute('data-motion', 'once')
})
