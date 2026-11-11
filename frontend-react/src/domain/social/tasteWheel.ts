import { TASTE_WHEEL_KINDS, type TasteWheelEntry, type TasteWheelKind } from './social.types'

const MAX_SCORE = 5

export interface TasteWheelSlice {
  key: string
  kind: TasteWheelKind
  value: string
  label: string
  score: number
  tone: string | null
  ratedWines: number
  /** Score as a fraction of the wheel radius (0-1). */
  ratio: number
  /** Degrees clockwise from twelve o'clock; the slice is centred on `labelAngle`. */
  startAngle: number
  endAngle: number
  labelAngle: number
  /** SVG path of the wedge for a given outer radius, centered at 0,0. */
  path: (radius: number) => string
}

/** A slice of one view of the wheel, with the colour its wedge and legend dot share. */
export interface TasteWheelViewSlice extends TasteWheelSlice {
  color: string
  /** How far out its wedge reaches across the ring (0.65-1): the best score of the view reaches the rim. */
  reach: number
}

/** The lowest score of a view still fills this share of the ring, so its wedge stays easy to see and tap. */
export const TASTE_WHEEL_MIN_REACH = 0.65

/** The colour families a grape's tone falls into. */
type GrapeFamily = 'RED' | 'ROSE' | 'WHITE' | 'OTHER'

/** Grapes go around the wheel in this order, so each tone keeps to one arc. */
const GRAPE_FAMILY_ORDER: GrapeFamily[] = ['RED', 'ROSE', 'WHITE', 'OTHER']

/**
 * Watercolour-friendly colours of the wheel. Grapes take the shades of their tone: garnet, ruby, violet and plum for reds,
 * pinks for rosés, gold, green-yellow and straw for whites, warm greys for anything else. Wine styles keep the swatches
 * the cellar cover already uses for each wine type. Regions get eight clearly different hues.
 */
export const TASTE_WHEEL_PALETTE = {
  GRAPE: {
    RED: ['#7A1F3D', '#B8304A', '#6B3F8F', '#9A4A7C'],
    ROSE: ['#E58FA6', '#D3637E', '#F2B5BC'],
    WHITE: ['#D4A537', '#B7C25A', '#E9D47F'],
    OTHER: ['#A99A8C', '#8C7F76', '#CDBDA9'],
  } satisfies Record<GrapeFamily, string[]>,
  TYPE: {
    RED: '#7A1D3E',
    WHITE: '#E4C766',
    ROSE: '#EE9AAE',
    SPARKLING: '#B9C98A',
    DESSERT: '#C9853A',
    FORTIFIED: '#6E2F22',
    ORANGE: '#E08A3C',
  } as Record<string, string>,
  REGION: ['#C8664A', '#D9A441', '#8A9A4B', '#3F8C8A', '#4F6FA8', '#8C6BB1', '#C95D85', '#8B5A3C'],
  NEUTRAL: '#A59B93',
}

/** `rosé`, `Rose` and `ROSE` are the same tone. */
function normalizeTone(tone: string | null | undefined): string {
  return (tone ?? '').normalize('NFD').replace(/\p{M}/gu, '').trim().toUpperCase()
}

function grapeFamily(tone: string | null): GrapeFamily {
  const value = normalizeTone(tone)
  return value === 'RED' || value === 'ROSE' || value === 'WHITE' ? value : 'OTHER'
}

/** The views that have entries, grapes first, then styles, then regions. */
export function tasteWheelViews(entries: TasteWheelEntry[]): TasteWheelKind[] {
  return TASTE_WHEEL_KINDS.filter((kind) => entries.some((entry) => entry.kind === kind))
}

/** The wheel opens on the grapes, or on the first view that has entries; `null` when there are none. */
export function defaultTasteWheelView(entries: TasteWheelEntry[]): TasteWheelKind | null {
  return tasteWheelViews(entries)[0] ?? null
}

function point(angle: number, radius: number): string {
  const radians = ((angle - 90) * Math.PI) / 180
  return `${(radius * Math.cos(radians)).toFixed(2)} ${(radius * Math.sin(radians)).toFixed(2)}`
}

/** Equal wedges, one per entry, centred on their middle angle (the first at twelve o'clock). */
export function tasteWheelSlices(entries: TasteWheelEntry[]): TasteWheelSlice[] {
  if (entries.length === 0) return []
  const step = 360 / entries.length
  return entries.map((entry, index) => {
    const startAngle = index * step - step / 2
    const endAngle = startAngle + step
    return {
      key: `${entry.kind}:${entry.value}`,
      kind: entry.kind,
      value: entry.value,
      label: entry.label,
      score: entry.score,
      tone: entry.tone,
      ratedWines: entry.ratedWines,
      ratio: entry.score / MAX_SCORE,
      startAngle,
      endAngle,
      labelAngle: index * step,
      path: (radius: number) =>
        step >= 360
          ? `M 0 ${-radius} A ${radius} ${radius} 0 1 1 0 ${radius} A ${radius} ${radius} 0 1 1 0 ${-radius} Z`
          : `M 0 0 L ${point(startAngle, radius)} A ${radius} ${radius} 0 ${step > 180 ? 1 : 0} 1 ${point(endAngle, radius)} Z`,
    }
  })
}

/** A point of the wheel art, centred at 0,0, y pointing down. */
export interface TasteWheelPoint {
  x: number
  y: number
}

/** The ring the wedges are painted on: radii and the wheel's full size, all in the same units (px). */
export interface TasteWheelRing {
  inner: number
  outer: number
  size: number
}

/** Where the wash texture of a wedge lies before it is turned `rotate` degrees with its slice. */
export interface TasteWheelWashBox {
  x: number
  y: number
  width: number
  height: number
  rotate: number
}

/** Everything needed to paint one wedge as watercolor. */
export interface TasteWheelWedge {
  key: string
  /** Which wash texture it uses (1-3). */
  variant: number
  /** The organic outline, as an SVG path (even-odd for a lone slice's ring). */
  path: string
  light: string
  dark: string
  wash: TasteWheelWashBox
  /** The darker line where the wash dries, along the inner side of the outline. */
  tide: { width: number; opacity: number }
}

/** The paper the watercolor is painted on. */
export const TASTE_WHEEL_PAPER = '#FAF5EE'
export const TASTE_WHEEL_WASH_VARIANTS = 3
export const TASTE_WHEEL_ARC_POINTS = 24
export const TASTE_WHEEL_SIDE_POINTS = 10
/** A highlighted wedge's outer radius grows by this factor. */
export const TASTE_WHEEL_HIGHLIGHT_GROWTH = 1.035
/** The wobble's largest swing, in units of size / 600. */
const WOBBLE_MAX = 4.4
const PAPER_RGB = [0xfa, 0xf5, 0xee]
const LIGHT_EXPONENT = 0.6
const DARK_EXPONENT = 1.2

/** Wobble of side `side` (0 outer, 1 inner, 2 end, 3 start) of slice `index` at `t`: deterministic, like a hand-painted edge. */
export function tasteWheelWobble(index: number, side: number, t: number, size: number): number {
  const s = index * 7.3 + side * 3.1
  return (size / 600) * (2.2 * Math.sin(3 * t + s) + 1.4 * Math.sin(7.7 * t + 1.9 * s) + 0.8 * Math.sin(17 * t + 2.7 * s))
}

/** The cream gap between neighbouring wedges. */
export function tasteWheelGap(size: number): number {
  return Math.max(size * 0.0083, 3)
}

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function polar(degrees: number, radius: number): TasteWheelPoint {
  return { x: radius * Math.sin(radians(degrees)), y: -radius * Math.cos(radians(degrees)) }
}

/** Points along one wobbly arc of `count` points, `t` running from -1 to 1 between the two angles. */
function arc(from: number, to: number, count: number, radiusAt: (t: number) => number): TasteWheelPoint[] {
  return Array.from({ length: count }, (_, j) => {
    const t = -1 + (2 * j) / (count - 1)
    return polar(from + ((t + 1) / 2) * (to - from), radiusAt(t))
  })
}

/**
 * The organic outline of a wedge: a slightly wobbly annular sector, deterministic per slice. It goes along the start
 * side outwards, the outer arc clockwise, the end side inwards and the inner arc back. Each side sits half a gap inside
 * its sector edge, moved by its own wobble. A lone slice is a whole ring: an outer and an inner loop.
 */
export function tasteWheelOutline(slice: Pick<TasteWheelSlice, 'startAngle' | 'endAngle'>, index: number, ring: TasteWheelRing): TasteWheelPoint[][] {
  const { inner, outer, size } = ring
  const wob = (side: number, t: number) => tasteWheelWobble(index, side, t, size)
  const outerAt = (t: number) => outer + wob(0, t)
  const innerAt = (t: number) => inner + 0.6 * wob(1, t)
  const { startAngle: start, endAngle: end } = slice
  if (end - start >= 360) {
    const count = 2 * TASTE_WHEEL_ARC_POINTS
    const loop = (radiusAt: (t: number) => number) => arc(start, end, count + 1, radiusAt).slice(0, count)
    return [loop(outerAt), loop(innerAt)]
  }
  const half = tasteWheelGap(size) / 2
  const offset = (side: number, t: number) => half - wob(side, t)
  const inset = (d: number, radius: number) => (Math.asin(d / radius) * 180) / Math.PI
  const startDir = { e: polar(start, 1), n: polar(start + 90, 1) }
  const endDir = { e: polar(end, 1), n: polar(end - 90, 1) }
  const side = (dir: typeof startDir, sideIndex: number, from: [number, number], to: [number, number]) =>
    Array.from({ length: TASTE_WHEEL_SIDE_POINTS }, (_, j) => {
      const step = (j + 1) / (TASTE_WHEEL_SIDE_POINTS + 1)
      const tRad = from[0] + step * (to[0] - from[0])
      const along = from[1] + step * (to[1] - from[1])
      const d = offset(sideIndex, tRad)
      return { x: along * dir.e.x + d * dir.n.x, y: along * dir.e.y + d * dir.n.y }
    })
  // The four corners: where each side meets its arc, as distances along the sector edge.
  const corner = (sideIndex: number, tRad: number, radius: number) => Math.sqrt(radius ** 2 - offset(sideIndex, tRad) ** 2)
  const outerArc = arc(start + inset(offset(3, 1), outerAt(-1)), end - inset(offset(2, 1), outerAt(1)), TASTE_WHEEL_ARC_POINTS, outerAt)
  const innerArc = arc(start + inset(offset(3, 0), innerAt(-1)), end - inset(offset(2, 0), innerAt(1)), TASTE_WHEEL_ARC_POINTS, innerAt).reverse()
  return [
    [
      ...side(startDir, 3, [0, corner(3, 0, innerAt(-1))], [1, corner(3, 1, outerAt(-1))]),
      ...outerArc,
      ...side(endDir, 2, [1, corner(2, 1, outerAt(1))], [0, corner(2, 0, innerAt(1))]),
      ...innerArc,
    ],
  ]
}

/** One closed SVG subpath per loop. */
export function tasteWheelOutlinePath(loops: TasteWheelPoint[][]): string {
  return loops.map((loop) => `M ${loop.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`).join(' ')
}

/** A colour as watercolor on the paper: each channel `paper * (c / 255) ^ exponent`. Only `#rrggbb` is shaded. */
export function watercolorShade(color: string, exponent: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color
  return `#${PAPER_RGB.map((paper, k) => {
    const c = Number.parseInt(color.slice(1 + 2 * k, 3 + 2 * k), 16) / 255
    return Math.round(paper * c ** exponent).toString(16).padStart(2, '0')
  }).join('')}`
}

export function tasteWheelLightShade(color: string): string {
  return watercolorShade(color, LIGHT_EXPONENT)
}

export function tasteWheelDarkShade(color: string): string {
  return watercolorShade(color, DARK_EXPONENT)
}

/**
 * Where the wash texture lies in the slice's own frame (its middle pointing up), so it turns with the slice: the
 * slice's bounding box, padded by the wobble; slices wider than 90 degrees take a 2R square.
 */
export function tasteWheelWashBox(slice: Pick<TasteWheelSlice, 'startAngle' | 'endAngle'>, ring: TasteWheelRing): TasteWheelWashBox {
  const step = slice.endAngle - slice.startAngle
  const rotate = (slice.startAngle + slice.endAngle) / 2
  const pad = WOBBLE_MAX * (ring.size / 600)
  const outer = ring.outer + pad
  if (step > 90) return { x: -outer, y: -outer, width: 2 * outer, height: 2 * outer, rotate }
  const halfWidth = outer * Math.sin(radians(step / 2))
  const bottom = -(ring.inner * Math.cos(radians(step / 2)) - pad)
  return { x: -halfWidth, y: -outer, width: 2 * halfWidth, height: bottom + outer, rotate }
}

/** How to paint slice `index` of a view as watercolor: as long as its reach, and 3.5% further out when highlighted. */
export function tasteWheelWedge(slice: TasteWheelViewSlice, index: number, ring: TasteWheelRing, highlighted: boolean): TasteWheelWedge {
  const outer = ring.inner + (ring.outer - ring.inner) * slice.reach
  const drawn = { ...ring, outer: highlighted ? outer * TASTE_WHEEL_HIGHLIGHT_GROWTH : outer }
  return {
    key: slice.key,
    variant: (index % TASTE_WHEEL_WASH_VARIANTS) + 1,
    path: tasteWheelOutlinePath(tasteWheelOutline(slice, index, drawn)),
    light: tasteWheelLightShade(slice.color),
    dark: tasteWheelDarkShade(slice.color),
    wash: tasteWheelWashBox(slice, drawn),
    tide: { width: ring.size * 0.0133, opacity: 0.4 },
  }
}

/** Grapes grouped by tone (reds, rosés, whites, the rest), keeping the server's order inside each group. */
function orderGrapes(entries: TasteWheelEntry[]): TasteWheelEntry[] {
  return GRAPE_FAMILY_ORDER.flatMap((family) => entries.filter((entry) => grapeFamily(entry.tone) === family))
}

/**
 * Each grape takes the next shade of its tone, so neighbours inside a group differ. When every grape shares one tone,
 * the last slice also touches the first around the circle: it then takes a shade unlike both of its neighbours.
 */
function grapeColors(entries: TasteWheelEntry[]): string[] {
  const used: Record<GrapeFamily, number> = { RED: 0, ROSE: 0, WHITE: 0, OTHER: 0 }
  const colors = entries.map((entry) => {
    const family = grapeFamily(entry.tone)
    const shades = TASTE_WHEEL_PALETTE.GRAPE[family]
    const color = shades[used[family] % shades.length] as string
    used[family] += 1
    return color
  })
  const last = colors.length - 1
  if (last > 0 && colors[last] === colors[0]) {
    const shades = TASTE_WHEEL_PALETTE.GRAPE[grapeFamily(entries[last]!.tone)]
    colors[last] = shades.find((shade) => shade !== colors[0] && shade !== colors[last - 1]) ?? (colors[last] as string)
  }
  return colors
}

function viewColors(kind: TasteWheelKind, entries: TasteWheelEntry[]): string[] {
  if (kind === 'GRAPE') return grapeColors(entries)
  if (kind === 'TYPE') return entries.map((entry) => TASTE_WHEEL_PALETTE.TYPE[normalizeTone(entry.tone ?? entry.value)] ?? TASTE_WHEEL_PALETTE.NEUTRAL)
  return entries.map((_, index) => TASTE_WHEEL_PALETTE.REGION[index % TASTE_WHEEL_PALETTE.REGION.length] as string)
}

/** One view of the wheel: only the entries of that kind, in wheel order, each with its colour. */
export function tasteWheelView(entries: TasteWheelEntry[], kind: TasteWheelKind): TasteWheelViewSlice[] {
  const ofKind = entries.filter((entry) => entry.kind === kind)
  const ordered = kind === 'GRAPE' ? orderGrapes(ofKind) : ofKind
  const colors = viewColors(kind, ordered)
  const scores = ordered.map((entry) => entry.score)
  const low = Math.min(...scores)
  const spread = Math.max(...scores) - low
  const reachOf = (score: number) => (spread > 0 ? TASTE_WHEEL_MIN_REACH + (1 - TASTE_WHEEL_MIN_REACH) * ((score - low) / spread) : 1)
  return tasteWheelSlices(ordered).map((slice, index) => ({ ...slice, color: colors[index] as string, reach: reachOf(slice.score) }))
}
