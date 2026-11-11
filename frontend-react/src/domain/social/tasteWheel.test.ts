import { describe, expect, it } from 'vitest'
import type { TasteWheelEntry } from './social.types'
import {
  TASTE_WHEEL_ARC_POINTS,
  TASTE_WHEEL_PALETTE,
  TASTE_WHEEL_PAPER,
  TASTE_WHEEL_SIDE_POINTS,
  defaultTasteWheelView,
  tasteWheelDarkShade,
  tasteWheelGap,
  tasteWheelLightShade,
  tasteWheelOutline,
  tasteWheelOutlinePath,
  tasteWheelSlices,
  tasteWheelView,
  tasteWheelViews,
  tasteWheelWashBox,
  tasteWheelWedge,
  tasteWheelWobble,
  watercolorShade,
} from './tasteWheel'

describe('taste wheel geometry', () => {
  it('splits the circle into equal slices centred on each slice, the first at twelve o\'clock, whose length follows the score', () => {
    const slices = tasteWheelSlices([
      { kind: 'TYPE', value: 'RED', label: 'Tinto', score: 5, tone: null, ratedWines: 0 },
      { kind: 'TYPE', value: 'WHITE', label: 'Blanco', score: 2.5, tone: null, ratedWines: 0 },
      { kind: 'GRAPE', value: 'malbec', label: 'Malbec', score: 0, tone: null, ratedWines: 0 },
      { kind: 'GRAPE', value: 'syrah', label: 'Syrah', score: 4, tone: null, ratedWines: 0 },
    ])
    expect(slices).toHaveLength(4)
    expect(slices.map((slice) => slice.startAngle)).toEqual([-45, 45, 135, 225])
    expect(slices.map((slice) => slice.endAngle)).toEqual([45, 135, 225, 315])
    expect(slices.map((slice) => slice.ratio)).toEqual([1, 0.5, 0, 0.8])
    expect(slices[0]!).toMatchObject({ key: 'TYPE:RED', kind: 'TYPE', value: 'RED', label: 'Tinto', score: 5 })
    expect(slices.map((slice) => slice.labelAngle)).toEqual([0, 90, 180, 270])
  })

  it('returns no slices for an empty wheel', () => {
    expect(tasteWheelSlices([])).toEqual([])
  })

  it('draws a closed wedge path from the center', () => {
    const [slice] = tasteWheelSlices([{ kind: 'TYPE', value: 'RED', label: 'Tinto', score: 5, tone: null, ratedWines: 0 }, { kind: 'TYPE', value: 'ROSE', label: 'Rosado', score: 1, tone: null, ratedWines: 0 }])
    expect(slice!.path(100)).toMatch(/^M 0 0 L .+ A 100 100 0 0 1 .+ Z$/)
  })

  it('draws a full disc when the wheel has a single axis', () => {
    const [slice] = tasteWheelSlices([{ kind: 'TYPE', value: 'RED', label: 'Tinto', score: 3, tone: null, ratedWines: 0 }])
    expect(slice!.path(50)).toBe('M 0 -50 A 50 50 0 1 1 0 50 A 50 50 0 1 1 0 -50 Z')
  })
})

const grape = (value: string, tone: string | null, score = 4): TasteWheelEntry => ({ kind: 'GRAPE', value, label: value, score, tone, ratedWines: 3 })
const type = (value: string, score = 4): TasteWheelEntry => ({ kind: 'TYPE', value, label: value, score, tone: value, ratedWines: 3 })
const region = (value: string, score = 4): TasteWheelEntry => ({ kind: 'REGION', value, label: value, score, tone: null, ratedWines: 3 })

/** Every slice's colour differs from the one after it, the last one included (the wheel is a circle). */
function neighboursDiffer(colors: string[]): boolean {
  return colors.length < 2 || colors.every((color, index) => color !== colors[(index + 1) % colors.length])
}

describe('taste wheel views', () => {
  it('offers grapes first, then styles, then regions, hiding a view with no entries', () => {
    expect(tasteWheelViews([region('mendoza'), type('RED'), grape('malbec', 'RED')])).toEqual(['GRAPE', 'TYPE', 'REGION'])
    expect(tasteWheelViews([region('mendoza'), type('RED')])).toEqual(['TYPE', 'REGION'])
    expect(tasteWheelViews([])).toEqual([])
  })

  it('opens on grapes, or on the first view that has entries', () => {
    expect(defaultTasteWheelView([type('RED'), grape('malbec', 'RED')])).toBe('GRAPE')
    expect(defaultTasteWheelView([region('mendoza'), type('RED')])).toBe('TYPE')
    expect(defaultTasteWheelView([region('mendoza')])).toBe('REGION')
    expect(defaultTasteWheelView([])).toBeNull()
  })

  it('draws only the chosen kind, splitting the whole circle among its entries', () => {
    const slices = tasteWheelView([type('RED'), grape('malbec', 'RED'), region('mendoza'), grape('torrontes', 'WHITE')], 'GRAPE')
    expect(slices.map((slice) => slice.kind)).toEqual(['GRAPE', 'GRAPE'])
    expect(slices.map((slice) => slice.endAngle)).toEqual([90, 270])
    expect(slices[0]).toMatchObject({ tone: 'RED', ratedWines: 3 })
  })

  it('groups grapes by tone: reds, then rosés, then whites, then the rest, keeping their order inside a group', () => {
    const slices = tasteWheelView(
      [grape('torrontes', 'WHITE'), grape('malbec', 'RED'), grape('x', 'ORANGE'), grape('garnacha', 'ROSE'), grape('syrah', 'RED'), grape('chardonnay', 'WHITE')],
      'GRAPE',
    )
    expect(slices.map((slice) => slice.value)).toEqual(['malbec', 'syrah', 'garnacha', 'torrontes', 'chardonnay', 'x'])
  })

  it('colours grapes by tone, in shades that never repeat next to each other', () => {
    const reds = ['a', 'b', 'c', 'd', 'e'].map((name) => grape(name, 'RED'))
    const redColors = tasteWheelView(reds, 'GRAPE').map((slice) => slice.color)
    expect(redColors.every((color) => TASTE_WHEEL_PALETTE.GRAPE.RED.includes(color))).toBe(true)
    expect(neighboursDiffer(redColors)).toBe(true)

    const mixed = tasteWheelView([grape('m', 'RED'), grape('s', 'RED'), grape('t', 'WHITE'), grape('c', 'WHITE'), grape('v', 'WHITE'), grape('g', 'ROSÉ'), grape('o', null)], 'GRAPE')
    expect(neighboursDiffer(mixed.map((slice) => slice.color))).toBe(true)
    expect(TASTE_WHEEL_PALETTE.GRAPE.WHITE).toContain(mixed.find((slice) => slice.value === 't')!.color)
    expect(TASTE_WHEEL_PALETTE.GRAPE.ROSE).toContain(mixed.find((slice) => slice.value === 'g')!.color)
    expect(TASTE_WHEEL_PALETTE.GRAPE.OTHER).toContain(mixed.find((slice) => slice.value === 'o')!.color)

    for (let count = 2; count <= 8; count += 1) {
      const whites = Array.from({ length: count }, (_, index) => grape(`w${index}`, 'WHITE'))
      expect(neighboursDiffer(tasteWheelView(whites, 'GRAPE').map((slice) => slice.color))).toBe(true)
    }
  })

  it('gives each wine type its own colour and each region a distinct hue', () => {
    const styles = tasteWheelView([type('RED'), type('WHITE'), type('ROSE'), type('MYSTERY')], 'TYPE')
    expect(styles.map((slice) => slice.color)).toEqual([
      TASTE_WHEEL_PALETTE.TYPE.RED,
      TASTE_WHEEL_PALETTE.TYPE.WHITE,
      TASTE_WHEEL_PALETTE.TYPE.ROSE,
      TASTE_WHEEL_PALETTE.NEUTRAL,
    ])
    const untoned = tasteWheelView([{ ...type('WHITE'), tone: null }], 'TYPE')
    expect(untoned[0]!.color).toBe(TASTE_WHEEL_PALETTE.TYPE.WHITE)
    const regions = tasteWheelView(Array.from({ length: 8 }, (_, index) => region(`r${index}`)), 'REGION')
    expect(new Set(regions.map((slice) => slice.color)).size).toBe(8)
  })
})


describe('taste wheel watercolor wedges', () => {
  const ring = { inner: 60, outer: 144, size: 320 }
  const slicesOf = (count: number) => tasteWheelSlices(Array.from({ length: count }, (_, index) => region(`r${index}`, index)))
  const radiusOf = (point: { x: number; y: number }) => Math.hypot(point.x, point.y)
  /** Degrees clockwise from twelve o'clock. */
  const angleOf = (point: { x: number; y: number }) => {
    const angle = (Math.atan2(point.x, -point.y) * 180) / Math.PI
    return angle < 0 ? angle + 360 : angle
  }

  it('wobbles by the hand-painted formula, scaled to the wheel size', () => {
    const s = 2 * 7.3 + 1 * 3.1
    const expected = 2.2 * Math.sin(3 * 0.5 + s) + 1.4 * Math.sin(7.7 * 0.5 + 1.9 * s) + 0.8 * Math.sin(17 * 0.5 + 2.7 * s)
    expect(tasteWheelWobble(2, 1, 0.5, 600)).toBeCloseTo(expected)
    expect(tasteWheelWobble(2, 1, 0.5, 300)).toBeCloseTo(expected / 2)
    expect(tasteWheelWobble(0, 0, 0, 600)).toBe(0)
  })

  it('keeps a cream gap of 0.83% of the wheel, never under 3 px', () => {
    expect(tasteWheelGap(600)).toBeCloseTo(4.98)
    expect(tasteWheelGap(320)).toBe(3)
  })

  it('draws each slice as one organic, deterministic outline of 24 points per arc and 10 per side', () => {
    const slices = slicesOf(6)
    const outline = tasteWheelOutline(slices[1]!, 1, ring)
    expect(outline).toHaveLength(1)
    expect(outline[0]).toHaveLength(2 * TASTE_WHEEL_ARC_POINTS + 2 * TASTE_WHEEL_SIDE_POINTS)
    expect(TASTE_WHEEL_ARC_POINTS).toBe(24)
    expect(TASTE_WHEEL_SIDE_POINTS).toBe(10)
    expect(tasteWheelOutline(slices[1]!, 1, ring)).toEqual(outline)
    expect(tasteWheelOutline(slices[2]!, 2, ring)[0]).not.toEqual(outline[0])
  })

  it('keeps every outline point inside the ring and its own sector, give or take the wobble', () => {
    for (const count of [2, 3, 5, 8, 12]) {
      slicesOf(count).forEach((slice, index) => {
        const wobble = 4.4 * (ring.size / 600)
        for (const point of tasteWheelOutline(slice, index, ring)[0]!) {
          expect(radiusOf(point)).toBeGreaterThanOrEqual(ring.inner - wobble)
          expect(radiusOf(point)).toBeLessThanOrEqual(ring.outer + wobble)
          const offset = ((angleOf(point) - slice.labelAngle + 540) % 360) - 180
          expect(Math.abs(offset)).toBeLessThan((slice.endAngle - slice.startAngle) / 2 + 2)
        }
      })
    }
  })

  it('wobbles the outer edge but not into a perfect arc', () => {
    const radii = tasteWheelOutline(slicesOf(4)[0]!, 0, ring)[0]!.slice(TASTE_WHEEL_SIDE_POINTS, TASTE_WHEEL_SIDE_POINTS + TASTE_WHEEL_ARC_POINTS).map(radiusOf)
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(0.5)
    for (const radius of radii) expect(Math.abs(radius - ring.outer)).toBeLessThanOrEqual(4.4 * (ring.size / 600) + 0.01)
  })

  it('draws a lone slice as a whole wobbly ring, outer and inner loops', () => {
    const [slice] = slicesOf(1)
    const outline = tasteWheelOutline(slice!, 0, ring)
    expect(outline).toHaveLength(2)
    expect(outline[0]!.every((point) => Math.abs(radiusOf(point) - ring.outer) <= 2.4)).toBe(true)
    expect(outline[1]!.every((point) => Math.abs(radiusOf(point) - ring.inner) <= 2.4)).toBe(true)
    expect(tasteWheelOutlinePath(outline).match(/M /g)).toHaveLength(2)
  })

  it('turns an outline into a closed SVG path per loop', () => {
    expect(tasteWheelOutlinePath([[{ x: 0, y: -1 }, { x: 1.234, y: 2 }, { x: -1, y: 0.5 }]])).toBe('M 0.00 -1.00 L 1.23 2.00 L -1.00 0.50 Z')
  })

  it('shades a colour like watercolor on paper: a light wash and a dark wash of the same pigment', () => {
    expect(TASTE_WHEEL_PAPER).toBe('#FAF5EE')
    expect(watercolorShade('#FFFFFF', 0.6)).toBe('#faf5ee')
    expect(watercolorShade('#000000', 1.2)).toBe('#000000')
    const [r, g, b] = [0x7a, 0x1f, 0x3d].map((c) => c / 255)
    const channel = (paper: number, c: number, exponent: number) => Math.round(paper * c ** exponent).toString(16).padStart(2, '0')
    expect(tasteWheelLightShade('#7A1F3D')).toBe(`#${channel(250, r!, 0.6)}${channel(245, g!, 0.6)}${channel(238, b!, 0.6)}`)
    expect(tasteWheelDarkShade('#7A1F3D')).toBe(`#${channel(250, r!, 1.2)}${channel(245, g!, 1.2)}${channel(238, b!, 1.2)}`)
    expect(watercolorShade('tomato', 1)).toBe('tomato')
  })

  it('turns the wash texture with the slice, covering its bounding box, or a 2R square past 90 degrees', () => {
    const slices = slicesOf(6)
    const box = tasteWheelWashBox(slices[2]!, ring)
    const pad = 4.4 * (ring.size / 600)
    expect(box.rotate).toBe(120)
    expect(box.x).toBeCloseTo(-(ring.outer + pad) * Math.sin(Math.PI / 6))
    expect(box.width).toBeCloseTo(-2 * box.x)
    expect(box.y).toBeCloseTo(-(ring.outer + pad))
    expect(box.y + box.height).toBeCloseTo(-(ring.inner * Math.cos(Math.PI / 6) - pad))
    expect(tasteWheelWashBox(slicesOf(3)[1]!, ring)).toEqual({ x: -ring.outer - pad, y: -ring.outer - pad, width: 2 * (ring.outer + pad), height: 2 * (ring.outer + pad), rotate: 120 })
  })

  it('makes each wedge as long as its score: the best reaches the rim, the lowest 65% of the ring, equal scores all full', () => {
    const scored = tasteWheelView([region('a', 4.5), region('b', 4), region('c', 3.5)], 'REGION')
    expect(scored.map((slice) => slice.reach)).toEqual([1, 0.825, 0.65])
    expect(tasteWheelView([region('a'), region('b')], 'REGION').map((slice) => slice.reach)).toEqual([1, 1])
    const short = tasteWheelWedge(scored[2]!, 2, ring, false)
    const outer = ring.inner + (ring.outer - ring.inner) * 0.65
    expect(short.path).toBe(tasteWheelOutlinePath(tasteWheelOutline(scored[2]!, 2, { ...ring, outer })))
    const grown = tasteWheelWedge(scored[2]!, 2, ring, true)
    expect(grown.path).toBe(tasteWheelOutlinePath(tasteWheelOutline(scored[2]!, 2, { ...ring, outer: outer * 1.035 })))
  })

  it('paints each slice with a wash variant, its shades and a tide line, growing the highlighted one by 3.5%', () => {
    const slices = tasteWheelView([region('a'), region('b'), region('c'), region('d')], 'REGION')
    const wedges = slices.map((slice, index) => tasteWheelWedge(slice, index, ring, false))
    expect(wedges.map((wedge) => wedge.variant)).toEqual([1, 2, 3, 1])
    expect(wedges[0]).toMatchObject({
      key: 'REGION:a',
      light: tasteWheelLightShade(slices[0]!.color),
      dark: tasteWheelDarkShade(slices[0]!.color),
      path: tasteWheelOutlinePath(tasteWheelOutline(slices[0]!, 0, ring)),
      wash: tasteWheelWashBox(slices[0]!, ring),
      tide: { width: 320 * 0.0133, opacity: 0.4 },
    })
    const grown = tasteWheelWedge(slices[0]!, 0, ring, true)
    expect(grown.path).toBe(tasteWheelOutlinePath(tasteWheelOutline(slices[0]!, 0, { ...ring, outer: ring.outer * 1.035 })))
    expect(grown.wash.y).toBeLessThan(wedges[0]!.wash.y)
  })
})
