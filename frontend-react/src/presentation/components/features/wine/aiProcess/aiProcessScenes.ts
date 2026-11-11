/**
 * The watercolor AI loading scenes as data: layers on a 128 px stage, each
 * with an optional motion track. A track maps the gesture's progress (0 the
 * starting pose, 1 the finished gesture, up to 1.25 while a replay erases the
 * page) to CSS properties; `AiProcessSceneArt` samples tracks into CSS
 * keyframes. The composition mirrors the app's `WineProcessSceneArt`.
 *
 * The wine scenes tell the AI profile and the comparison; the taste quiz
 * scenes (`gather`, `fill`, `blend`, `paint`) tell the member's own taste
 * profile taking shape: the options they picked are drawn into a journal, and
 * from there the story goes on with wine, color and the taste wheel.
 */

import { toWineType, type WineType } from '@domain/wine/wine.types'
import balanceBeam from '@assets/loading/balance-beam.webp'
import balancePan from '@assets/loading/balance-pan.webp'
import balanceStand from '@assets/loading/balance-stand.webp'
import bottleOpen from '@assets/loading/bottle.webp'
import bottleClearAmber from '@assets/loading/bottle-clear-amber.webp'
import bottleClearRose from '@assets/loading/bottle-clear-rose.webp'
import bottleClearWhite from '@assets/loading/bottle-clear-white.webp'
import bottleSparkling from '@assets/loading/bottle-sparkling.webp'
import brushImage from '@assets/loading/brush.webp'
import cageImage from '@assets/loading/cage.webp'
import corkImage from '@assets/loading/cork.webp'
import corkSparklingImage from '@assets/loading/cork-sparkling.webp'
import corkscrewImage from '@assets/loading/corkscrew.webp'
import glassFlute from '@assets/loading/glass-flute.webp'
import glassRed from '@assets/loading/glass-red.webp'
import glassRose from '@assets/loading/glass-rose.webp'
import glassTulip from '@assets/loading/glass-tulip.webp'
import grapesRed from '@assets/loading/grapes-red.webp'
import grapesWhite from '@assets/loading/grapes-white.webp'
import handwritingImage from '@assets/loading/handwriting.webp'
import glassTopImage from '@assets/loading/glass-top.webp'
import glassTopGarnetImage from '@assets/loading/glass-top-garnet.webp'
import journalFlatImage from '@assets/loading/journal-flat.webp'
import magnifierImage from '@assets/loading/magnifier.webp'
import paletteImage from '@assets/loading/palette.webp'
import paperImage from '@assets/loading/paper.webp'
import penImage from '@assets/loading/pen.webp'
import petalAmber from '@assets/loading/petal-amber.webp'
import petalGold from '@assets/loading/petal-gold.webp'
import petalRose from '@assets/loading/petal-rose.webp'
import petalRuby from '@assets/loading/petal-ruby.webp'
import petalSage from '@assets/loading/petal-sage.webp'
import petalViolet from '@assets/loading/petal-violet.webp'
import wineAmber from '@assets/loading/wine-amber.webp'
import wineRed from '@assets/loading/wine-red.webp'
import wineRose from '@assets/loading/wine-rose.webp'
import wineRuby from '@assets/loading/wine-ruby.webp'
import wineSparkling from '@assets/loading/wine-sparkling.webp'
import wineWhite from '@assets/loading/wine-white.webp'
import wispOne from '@assets/loading/wisp-1.webp'
import wispTwo from '@assets/loading/wisp-2.webp'
import wispThree from '@assets/loading/wisp-3.webp'

/* ── Scenes and wine looks ─────────────────────────────────────────── */

export type AiProcessSceneName =
  | 'uncork'
  | 'visual'
  | 'bouquet'
  | 'taste'
  | 'report'
  | 'compare'
  | 'structure'
  | 'contrast'
  | 'recommendation'
  | 'gather'
  | 'fill'
  | 'blend'
  | 'paint'

/** The illustrations of the taste quiz options the member picked, in question order; scenes draw at most five. */
export type ScenePicks = readonly string[]

type SceneGlass = 'bordeaux' | 'rose' | 'tulip' | 'flute'
type SceneWine = 'red' | 'ruby' | 'rose' | 'white' | 'amber' | 'sparkling'
type SceneBottle = 'dark' | 'clear' | 'sparkling'

export interface WineSceneLook {
  glass: SceneGlass
  wine: SceneWine
  bottle: SceneBottle
  grapes: 'red' | 'white'
}

export interface WineSceneLooks {
  first: WineSceneLook
  second: WineSceneLook
}

const RED: WineSceneLook = { glass: 'bordeaux', wine: 'red', bottle: 'dark', grapes: 'red' }

const LOOKS: Record<WineType, WineSceneLook> = {
  red: RED,
  fortified: { glass: 'bordeaux', wine: 'ruby', bottle: 'dark', grapes: 'red' },
  rose: { glass: 'rose', wine: 'rose', bottle: 'clear', grapes: 'red' },
  white: { glass: 'tulip', wine: 'white', bottle: 'clear', grapes: 'white' },
  orange: { glass: 'tulip', wine: 'amber', bottle: 'clear', grapes: 'white' },
  dessert: { glass: 'tulip', wine: 'amber', bottle: 'clear', grapes: 'white' },
  sparkling: { glass: 'flute', wine: 'sparkling', bottle: 'sparkling', grapes: 'white' },
}

/** The look of a wine in the scenes; a red wine until its type is known. Accepts API casing (`ROSE`). */
export function wineSceneLook(type?: string | null): WineSceneLook {
  const wineType = toWineType(type)
  return wineType ? LOOKS[wineType] : RED
}

/** One wine (drawn twice when a scene needs two) or the two wines of a comparison. */
export function wineSceneLooks(first?: string | null, second: string | null | undefined = first): WineSceneLooks {
  return { first: wineSceneLook(first), second: wineSceneLook(second) }
}

export function lookKey(look: WineSceneLook): string {
  return `${look.glass}-${look.wine}-${look.bottle}-${look.grapes}`
}

/** How long each gesture plays, in ms. */
export const SCENE_ACTION_MS: Record<AiProcessSceneName, number> = {
  uncork: 1600,
  visual: 1600,
  bouquet: 1600,
  taste: 1600,
  report: 3000,
  compare: 2200,
  structure: 2200,
  contrast: 2200,
  recommendation: 3000,
  gather: 3400,
  fill: 2500,
  blend: 2500,
  paint: 2500,
}

/** Scenes whose gesture plays again on the last step while the answer is pending. */
export const REPLAYABLE_SCENES: ReadonlySet<AiProcessSceneName> = new Set(['report', 'recommendation', 'paint'])

/** Past 1 the page fades so it can be written again. */
export const REPLAY_FADE_END = 1.25

/* ── Motion helpers ────────────────────────────────────────────────── */

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)
const between = (value: number, start: number, end: number) => clamp01((value - start) / (end - start))

/** 0 before `start`, 1 after `end`, eased in and out between them. */
export function phase(value: number, start: number, end: number): number {
  const t = between(value, start, end)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** 0 before `start`, 1 after `end`, slowing down like an object coming to rest. */
export function settle(value: number, start: number, end: number): number {
  const t = between(value, start, end)
  return 1 - Math.pow(1 - t, 3)
}

/** Linear interpolation over several stops, clamped at both ends. */
function interpolate(value: number, input: readonly number[], output: readonly number[]): number {
  if (value <= input[0]!) return output[0]!
  for (let i = 1; i < input.length; i++) {
    if (value <= input[i]!) {
      const t = (value - input[i - 1]!) / (input[i]! - input[i - 1]!)
      return output[i - 1]! + (output[i]! - output[i - 1]!) * t
    }
  }
  return output[output.length - 1]!
}

const px = (value: number) => `${Math.round(value * 100) / 100}px`
const num = (value: number) => String(Math.round(value * 1000) / 1000)

/** CSS properties of a layer at one moment, keyed by CSS property name. */
export type Pose = Partial<Record<'opacity' | 'transform' | 'clip-path' | 'top' | 'height' | 'filter', string>>
export type Track = (progress: number) => Pose

/* ── Art ───────────────────────────────────────────────────────────── */

interface Art {
  src: string
  /** Pixel size of the prepared watercolor layer. */
  w: number
  h: number
}

const art = {
  bottle: { src: bottleOpen, w: 239, h: 297 },
  bottleClearWhite: { src: bottleClearWhite, w: 242, h: 306 },
  bottleClearRose: { src: bottleClearRose, w: 242, h: 306 },
  bottleClearAmber: { src: bottleClearAmber, w: 242, h: 306 },
  bottleSparkling: { src: bottleSparkling, w: 237, h: 296 },
  cork: { src: corkImage, w: 76, h: 172 },
  corkSparkling: { src: corkSparklingImage, w: 113, h: 160 },
  cage: { src: cageImage, w: 135, h: 149 },
  corkscrew: { src: corkscrewImage, w: 224, h: 273 },
  glassRed: { src: glassRed, w: 298, h: 331 },
  wineRed: { src: wineRed, w: 298, h: 331 },
  wineRuby: { src: wineRuby, w: 298, h: 331 },
  glassRose: { src: glassRose, w: 299, h: 334 },
  wineRose: { src: wineRose, w: 299, h: 334 },
  glassTulip: { src: glassTulip, w: 298, h: 339 },
  wineWhite: { src: wineWhite, w: 298, h: 339 },
  wineAmber: { src: wineAmber, w: 298, h: 339 },
  glassFlute: { src: glassFlute, w: 300, h: 339 },
  wineSparkling: { src: wineSparkling, w: 300, h: 339 },
  wispOne: { src: wispOne, w: 50, h: 150 },
  wispTwo: { src: wispTwo, w: 45, h: 150 },
  wispThree: { src: wispThree, w: 52, h: 150 },
  paper: { src: paperImage, w: 236, h: 330 },
  handwriting: { src: handwritingImage, w: 200, h: 128 },
  pen: { src: penImage, w: 137, h: 150 },
  stand: { src: balanceStand, w: 132, h: 236 },
  beam: { src: balanceBeam, w: 247, h: 76 },
  pan: { src: balancePan, w: 145, h: 184 },
  grapesRed: { src: grapesRed, w: 132, h: 150 },
  grapesWhite: { src: grapesWhite, w: 143, h: 150 },
  magnifier: { src: magnifierImage, w: 202, h: 220 },
  journalFlat: { src: journalFlatImage, w: 360, h: 258 },
  palette: { src: paletteImage, w: 275, h: 280 },
  brush: { src: brushImage, w: 271, h: 280 },
  petalRuby: { src: petalRuby, w: 213, h: 280 },
  petalRose: { src: petalRose, w: 215, h: 280 },
  petalGold: { src: petalGold, w: 217, h: 280 },
  petalSage: { src: petalSage, w: 213, h: 280 },
  petalViolet: { src: petalViolet, w: 216, h: 280 },
  petalAmber: { src: petalAmber, w: 215, h: 280 },
  glassTop: { src: glassTopImage, w: 240, h: 243 },
  glassTopGarnet: { src: glassTopGarnetImage, w: 240, h: 244 },
} satisfies Record<string, Art>

type Box = readonly [x: number, y: number, width: number, height: number]

const glasses: Record<SceneGlass, { glass: Art; wineBox: Box }> = {
  bordeaux: { glass: art.glassRed, wineBox: [0.292, 0.349, 0.423, 0.235] },
  rose: { glass: art.glassRose, wineBox: [0.284, 0.347, 0.433, 0.23] },
  tulip: { glass: art.glassTulip, wineBox: [0.323, 0.347, 0.356, 0.152] },
  flute: { glass: art.glassFlute, wineBox: [0.381, 0.263, 0.235, 0.245] },
}

const wines: Record<SceneWine, Art> = {
  red: art.wineRed,
  ruby: art.wineRuby,
  rose: art.wineRose,
  white: art.wineWhite,
  amber: art.wineAmber,
  sparkling: art.wineSparkling,
}

/** Colour of the stream poured into the glass. */
export const POUR_COLORS: Record<SceneWine, string> = {
  red: '#7A1F2E',
  ruby: '#8E2A36',
  rose: '#E39A8E',
  white: '#E3CF7C',
  amber: '#D08A3A',
  sparkling: '#E8C860',
}

function bottleArt(look: WineSceneLook): Art {
  if (look.bottle === 'dark') return art.bottle
  if (look.bottle === 'sparkling') return art.bottleSparkling
  if (look.wine === 'rose') return art.bottleClearRose
  if (look.wine === 'amber') return art.bottleClearAmber
  return art.bottleClearWhite
}

const BOTTLE_LIP: Record<SceneBottle, { x: number; y: number }> = {
  dark: { x: 122, y: 8 },
  clear: { x: 124.5, y: 9 },
  sparkling: { x: 121.5, y: 8 },
}

/* ── Layers ────────────────────────────────────────────────────────── */

export const SCENE_SIZE = 128
const CENTER = SCENE_SIZE / 2

/** One element on the stage. Children are positioned inside it. */
export interface SceneLayer {
  id: string
  x: number
  y: number
  w: number
  h: number
  /** A watercolor image filling the layer. */
  src?: string
  /** Hide what falls outside the layer. */
  clip?: boolean
  /** A painted shape instead of an image. */
  shape?: 'stream' | 'bubble' | 'foam' | 'blot'
  color?: string
  /** Blend into what lies beneath, as ink and watercolor soak into paper. */
  blend?: 'multiply'
  /** A fixed opacity for a layer without a track. */
  opacity?: number
  track?: Track
  /** A looping motion with its own period, independent of the gesture. */
  loop?: { periodMs: number; offset: number; track: Track }
  children?: SceneLayer[]
}

function sprite(id: string, item: Art, scale: number, x: number, y: number, extra: Partial<SceneLayer> = {}): SceneLayer {
  return { id, src: item.src, x, y, w: item.w * scale, h: item.h * scale, ...extra }
}

const BUBBLES = [
  [0.3, 0],
  [0.62, 0.35],
  [0.45, 0.62],
  [0.74, 0.18],
  [0.38, 0.84],
] as const
const BUBBLE_RISE_MS = 1500

interface GlassPlacement {
  id: string
  look: WineSceneLook
  scale: number
  x: number
  y: number
  from: number
  to: number
  start: number
  end: number
}

/** A glass whose wine rises or falls: the wine layer is uncovered from the bottom up. */
function filledGlass({ id, look, scale, x, y, from, to, start, end }: GlassPlacement): SceneLayer {
  const { glass, wineBox } = glasses[look.glass]
  const width = glass.w * scale
  const height = glass.h * scale
  const [bx, by, bw, bh] = wineBox
  const left = bx * width
  const top = by * height
  const boxWidth = bw * width
  const boxHeight = bh * height
  const level = (p: number) => from + (to - from) * phase(p, start, end)
  const surface: Track = (p) => ({
    'clip-path': `inset(${px(top + boxHeight * (1 - level(p)))} ${px(width - left - boxWidth)} ${px(height - top - boxHeight)} ${px(left)})`,
  })
  const bubbles: SceneLayer[] =
    look.wine === 'sparkling'
      ? BUBBLES.map(([across, offset], index) => ({
          id: `${id}-bubble-${index}`,
          shape: 'bubble' as const,
          x: left + across * boxWidth - 1.3,
          y: top + boxHeight - 3,
          w: 2.6,
          h: 2.6,
          loop: {
            periodMs: BUBBLE_RISE_MS,
            offset,
            track: (t: number) => ({
              opacity: num(interpolate(t, [0, 0.15, 0.85, 1], [0, 0.9, 0.9, 0])),
              transform: `translate(${px(0.6 * Math.sin(t * 2 * Math.PI))}, ${px(-boxHeight * t)})`,
            }),
          },
        }))
      : []
  return sprite(id, glass, scale, x, y, {
    children: [
      {
        id: `${id}-wine`,
        x: 0,
        y: 0,
        w: width,
        h: height,
        track: surface,
        children: [{ id: `${id}-${look.wine}`, src: wines[look.wine].src, x: 0, y: 0, w: width, h: height }, ...bubbles],
      },
    ],
  })
}

const LIP = 72
const BOTTLE_SCALE = 0.6

function openBottle(look: WineSceneLook): SceneLayer {
  const lip = BOTTLE_LIP[look.bottle]
  return sprite(`uncork-bottle-${look.bottle}`, bottleArt(look), BOTTLE_SCALE, CENTER - lip.x * BOTTLE_SCALE, LIP - lip.y * BOTTLE_SCALE)
}

/** The corkscrew turns into the cork, pulls it out and the aroma escapes. */
function corkscrewScene(look: WineSceneLook): SceneLayer[] {
  const corkScale = 12 / art.cork.w
  const screwScale = 0.17
  const screwHeight = art.corkscrew.h * screwScale
  const corkTop = LIP - 4
  const pull = 30
  return [
    openBottle(look),
    sprite('uncork-aroma', art.wispTwo, 0.2, CENTER - 4.5, LIP - 26, {
      track: (p) => ({
        opacity: num(interpolate(p, [0.72, 0.84, 1], [0, 0.7, 0])),
        transform: `translateY(${px(-18 * phase(p, 0.72, 1))})`,
      }),
    }),
    {
      id: 'uncork-neck',
      x: 0,
      y: 0,
      w: SCENE_SIZE,
      h: LIP,
      clip: true,
      children: [
        sprite('uncork-corkscrew', art.corkscrew, screwScale, CENTER - 110 * screwScale, corkTop - 2 - screwHeight, {
          track: (p) => {
            const turns = interpolate(p, [0.04, 0.46], [0, 1.5])
            const y = 14 * phase(p, 0.04, 0.46) - pull * settle(p, 0.5, 0.8)
            return { transform: `translateY(${px(y)}) scaleX(${num(Math.cos(turns * 2 * Math.PI))})` }
          },
        }),
        sprite('uncork-cork', art.cork, corkScale, CENTER - 6, corkTop, {
          track: (p) => ({ transform: `translateY(${px(-pull * settle(p, 0.5, 0.8))})` }),
        }),
      ],
    },
  ]
}

const FOAM = [
  [-4, 7, 0],
  [3.5, 8, 0.03],
  [0, 10, 0.06],
  [-2.5, 6.5, 0.1],
  [4.5, 6, 0.13],
  [1, 7.5, 0.16],
] as const
const CORK_SPARKLING_WIDTH = 16
const CORK_IN_NECK = 9

/** The wire cage comes off, the cork wiggles loose and pops, and foam wells up. */
function popScene(look: WineSceneLook): SceneLayer[] {
  const scale = CORK_SPARKLING_WIDTH / art.corkSparkling.w
  const corkTop = LIP + CORK_IN_NECK - art.corkSparkling.h * scale
  const cageWidth = art.cage.w * scale
  const foam: SceneLayer[] = FOAM.map(([dx, size, delay], index) => ({
    id: `uncork-foam-${index}`,
    shape: 'foam',
    x: CENTER + dx - size / 2,
    y: LIP - size / 2,
    w: size,
    h: size,
    track: (p) => {
      const up = settle(p, 0.6 + delay, 0.86 + delay)
      return {
        opacity: num(up * (1 - 0.25 * phase(p, 0.9, 1))),
        transform: `translateY(${px(-9 * up)}) scale(${num(0.3 + 0.7 * up)})`,
      }
    },
  }))
  return [
    openBottle(look),
    ...foam,
    {
      id: 'uncork-neck',
      x: 0,
      y: 0,
      w: SCENE_SIZE,
      h: LIP,
      clip: true,
      children: [
        sprite('uncork-sparkling-cork', art.corkSparkling, scale, CENTER - CORK_SPARKLING_WIDTH / 2, corkTop, {
          track: (p) => {
            const wiggle = p < 0.58 ? 7 * Math.sin(phase(p, 0.38, 0.58) * 6 * Math.PI) : 0
            const flight = settle(p, 0.58, 0.82)
            return {
              opacity: num(1 - phase(p, 0.74, 0.84)),
              transform: `translate(${px(10 * flight)}, ${px(-70 * flight)}) rotate(${num(wiggle + 220 * flight)}deg)`,
            }
          },
        }),
      ],
    },
    sprite('uncork-cage', art.cage, scale, CENTER - cageWidth / 2, corkTop - 1, {
      track: (p) => {
        const off = phase(p, 0.06, 0.36)
        return {
          opacity: num(1 - phase(p, 0.24, 0.4)),
          transform: `translate(${px(16 * off)}, ${px(-12 * off)}) rotate(${num(28 * off)}deg)`,
        }
      },
    }),
  ]
}

/** Wine pours into the glass and the stream stops once it is served. */
function pourScene(look: WineSceneLook): SceneLayer[] {
  const scale = 0.36
  const { glass, wineBox } = glasses[look.glass]
  const width = glass.w * scale
  const height = glass.h * scale
  const x = (SCENE_SIZE - width) / 2
  const y = (SCENE_SIZE - height) / 2
  const [bx, by, bw, bh] = wineBox
  const bowlBottom = y + (by + bh) * height
  const start = 0.1
  const end = 0.76
  return [
    filledGlass({ id: 'visual-glass', look, scale, x, y, from: 0, to: 1, start, end }),
    {
      id: 'visual-pour',
      shape: 'stream',
      color: POUR_COLORS[look.wine],
      x: x + (bx + bw / 2) * width - 1.2,
      y: 0,
      w: 2.4,
      h: bowlBottom,
      track: (p) => {
        const surface = bowlBottom - bh * height * phase(p, start, end)
        const reach = bowlBottom * phase(p, 0, start)
        const top = surface * phase(p, 0.64, 0.84)
        const streamHeight = Math.max(0, Math.min(reach, surface) - top)
        return { top: px(top), height: px(streamHeight) }
      },
    },
  ]
}

const wisps = [art.wispOne, art.wispTwo, art.wispThree]

/** Aromas rise from the glass in three wisps. */
function bouquetScene(look: WineSceneLook): SceneLayer[] {
  const scale = 0.27
  const { glass } = glasses[look.glass]
  const width = glass.w * scale
  const height = glass.h * scale
  const x = (SCENE_SIZE - width) / 2
  const y = SCENE_SIZE - height - 6
  const rim = y + 0.12 * height
  const wispScale = 0.21
  return [
    filledGlass({ id: 'bouquet-glass', look, scale, x, y, from: 1, to: 1, start: 0, end: 1 }),
    ...wisps.map((wisp, index) => {
      const start = 0.05 + index * 0.16
      return sprite(`bouquet-wisp-${index}`, wisp, wispScale, CENTER - (wisp.w * wispScale) / 2 + (index - 1) * 15, rim - wisp.h * wispScale, {
        track: (p) => ({
          opacity: num(0.8 * phase(p, start, start + 0.3)),
          transform: `translateY(${px(10 - 16 * settle(p, start, start + 0.6))})`,
        }),
      })
    }),
  ]
}

/** A sip lowers the wine in the glass. */
function tasteScene(look: WineSceneLook): SceneLayer[] {
  const scale = 0.36
  const { glass } = glasses[look.glass]
  return [
    filledGlass({
      id: 'taste-glass',
      look,
      scale,
      x: (SCENE_SIZE - glass.w * scale) / 2,
      y: (SCENE_SIZE - glass.h * scale) / 2,
      from: 1,
      to: 0.55,
      start: 0.12,
      end: 0.8,
    }),
  ]
}

const handwritingLines = [
  [0, 0.203],
  [0.235, 0.383],
  [0.388, 0.526],
  [0.537, 0.644],
  [0.684, 0.827],
  [0.852, 1],
] as const
const LINE_STEP = 0.145
const LINE_WRITE = 0.1

/** The pen writes the tasting notes on the page, line by line. */
function writingScene(): SceneLayer[] {
  const paperScale = 0.34
  const paperWidth = art.paper.w * paperScale
  const paperHeight = art.paper.h * paperScale
  const paperX = (SCENE_SIZE - paperWidth) / 2
  const paperY = (SCENE_SIZE - paperHeight) / 2
  const handScale = 0.31
  const handWidth = art.handwriting.w * handScale
  const handHeight = art.handwriting.h * handScale
  const handX = paperX + 9
  const handY = paperY + 16
  const penScale = 0.23
  const nibX = 0.06 * art.pen.w * penScale
  const nibY = 0.99 * art.pen.h * penScale
  const restX = paperX + paperWidth - 14
  const restY = paperY + paperHeight - 12
  const writtenAt = (handwritingLines.length - 1) * LINE_STEP + LINE_WRITE
  const lineCenter = ([top, bottom]: readonly [number, number]) => handY + (handHeight * (top + bottom)) / 2
  const firstLineY = lineCenter(handwritingLines[0])

  const pen: Track = (p) => {
    if (p > 1) {
      const back = phase(p, 1, REPLAY_FADE_END)
      return { transform: `translate(${px(restX + (handX - restX) * back - nibX)}, ${px(restY + (firstLineY - restY) * back - nibY)})` }
    }
    const line = Math.min(Math.floor(p / LINE_STEP), handwritingLines.length - 1)
    const lineStart = line * LINE_STEP
    const lineY = lineCenter(handwritingLines[line]!)
    const along = phase(p, lineStart, lineStart + LINE_WRITE)
    let writeX = handX + handWidth * along
    let writeY = lineY + 0.7 * Math.sin(along * Math.PI * 9) * (along < 1 ? 1 : 0)
    const next = handwritingLines[line + 1]
    if (next && p > lineStart + LINE_WRITE) {
      const carry = phase(p, lineStart + LINE_WRITE, lineStart + LINE_STEP)
      writeX = handX + handWidth * (1 - carry)
      writeY = lineY + (lineCenter(next) - lineY) * carry - 2 * Math.sin(carry * Math.PI)
    }
    const lift = phase(p, writtenAt, 1)
    return {
      transform: `translate(${px(writeX + (restX - writeX) * lift - nibX)}, ${px(writeY + (restY - writeY) * lift - nibY)})`,
    }
  }

  return [
    sprite('writing-paper', art.paper, paperScale, paperX, paperY),
    {
      id: 'writing-ink',
      x: 0,
      y: 0,
      w: SCENE_SIZE,
      h: SCENE_SIZE,
      track: (p) => ({ opacity: num(1 - phase(p, 1, REPLAY_FADE_END)) }),
      children: handwritingLines.map(([top, bottom], index) => {
        const start = index * LINE_STEP
        return {
          id: `writing-line-${index}`,
          x: handX,
          y: handY + top * handHeight,
          w: handWidth,
          h: (bottom - top) * handHeight,
          clip: true,
          track: (p: number) => ({ 'clip-path': `inset(0 ${num((1 - phase(p, start, start + LINE_WRITE)) * 100)}% 0 0)` }),
          children: [{ id: `writing-line-${index}-ink`, src: art.handwriting.src, x: 0, y: -top * handHeight, w: handWidth, h: handHeight }],
        }
      }),
    },
    sprite('writing-pen', art.pen, penScale, 0, 0, { track: pen }),
  ]
}

const PAIR_SCALE = 0.23
const PAIR_X = [36, 92] as const

function pairPlace(look: WineSceneLook, side: 0 | 1) {
  const { glass, wineBox } = glasses[look.glass]
  const height = glass.h * PAIR_SCALE
  const x = PAIR_X[side] - (glass.w * PAIR_SCALE) / 2
  const y = (SCENE_SIZE - height) / 2 + 4
  return { x, y, bowlY: y + (wineBox[1] + wineBox[3] / 2) * height }
}

/** Both wines are poured side by side. */
function compareScene(looks: WineSceneLooks): SceneLayer[] {
  const left = pairPlace(looks.first, 0)
  const right = pairPlace(looks.second, 1)
  return [
    filledGlass({ id: 'compare-first', look: looks.first, scale: PAIR_SCALE, x: left.x, y: left.y, from: 0, to: 1, start: 0.04, end: 0.7 }),
    filledGlass({ id: 'compare-second', look: looks.second, scale: PAIR_SCALE, x: right.x, y: right.y, from: 0, to: 1, start: 0.18, end: 0.84 }),
  ]
}

const LENS = { x: 0.337, y: 0.311 } as const

/** A magnifier looks closely at one wine and then the other. */
function contrastScene(looks: WineSceneLooks): SceneLayer[] {
  const scale = 0.22
  const lensX = LENS.x * art.magnifier.w * scale
  const lensY = LENS.y * art.magnifier.h * scale
  const left = pairPlace(looks.first, 0)
  const right = pairPlace(looks.second, 1)
  const stops = [
    { x: 112, y: 122 },
    { x: PAIR_X[0], y: left.bowlY },
    { x: PAIR_X[1], y: right.bowlY },
  ] as const
  return [
    filledGlass({ id: 'contrast-first', look: looks.first, scale: PAIR_SCALE, x: left.x, y: left.y, from: 1, to: 1, start: 0, end: 1 }),
    filledGlass({ id: 'contrast-second', look: looks.second, scale: PAIR_SCALE, x: right.x, y: right.y, from: 0.7, to: 0.7, start: 0, end: 1 }),
    sprite('contrast-magnifier', art.magnifier, scale, 0, 0, {
      track: (p) => {
        const toFirst = phase(p, 0, 0.35)
        const toSecond = phase(p, 0.55, 0.85)
        const x = stops[0].x + (stops[1].x - stops[0].x) * toFirst + (stops[2].x - stops[1].x) * toSecond
        const y = stops[0].y + (stops[1].y - stops[0].y) * toFirst + (stops[2].y - stops[1].y) * toSecond
        const lean = Math.sin(phase(p, 0.3, 0.55) * Math.PI) + Math.sin(phase(p, 0.82, 1) * Math.PI)
        return {
          opacity: num(phase(p, 0, 0.15)),
          transform: `translate(${px(x - lensX)}, ${px(y - lensY)}) scale(${num(1 + 0.06 * lean)})`,
        }
      },
    }),
  ]
}

const GRAPES_LAND = 0.3

/** Beam angle in degrees: the swing the landing grapes start, coming to rest level. */
function balanceTilt(value: number): number {
  const t = clamp01((value - GRAPES_LAND) / (1 - GRAPES_LAND))
  return -14 * Math.pow(1 - t, 2) * Math.sin(2.6 * Math.PI * t)
}

/** A pan hangs from its end of the beam, so it follows that hook without rotating. */
function hangFrom(degrees: number, hookX: number, hookY: number): string {
  const angle = (degrees * Math.PI) / 180
  const dx = hookX * Math.cos(angle) - hookY * Math.sin(angle) - hookX
  const dy = hookX * Math.sin(angle) + hookY * Math.cos(angle) - hookY
  return `translate(${px(dx)}, ${px(dy)})`
}

function grapesInPan(id: string, item: Art, panWidth: number, panHeight: number, start: number): SceneLayer {
  const scale = 21 / item.h
  return sprite(id, item, scale, (panWidth - item.w * scale) / 2, 0.8 * panHeight - item.h * scale, {
    track: (p) => ({
      opacity: num(phase(p, start, start + 0.12)),
      transform: `translateY(${px(-14 * (1 - settle(p, start, start + 0.22)))})`,
    }),
  })
}

/** A bunch of grapes drops into each pan; the balance swings and comes to rest level. */
function structureScene(looks: WineSceneLooks): SceneLayer[] {
  const s = 0.25
  const standWidth = art.stand.w * s
  const standHeight = art.stand.h * s
  const standY = 114 - standHeight
  const pivotY = standY + 10 * s
  const beamWidth = art.beam.w * s
  const beamHeight = art.beam.h * s
  const arm = 0.47 * beamWidth
  const drop = 0.45 * beamHeight
  const panWidth = art.pan.w * s
  const panHeight = art.pan.h * s
  const panY = pivotY + drop - 0.03 * art.pan.h * s
  const grapes = { red: art.grapesRed, white: art.grapesWhite }
  return [
    sprite('structure-stand', art.stand, s, CENTER - standWidth / 2, standY),
    sprite('structure-pan-left', art.pan, s, CENTER - arm - panWidth / 2, panY, {
      track: (p) => ({ transform: hangFrom(balanceTilt(p), -arm, drop) }),
      children: [grapesInPan('structure-grapes-left', grapes[looks.first.grapes], panWidth, panHeight, 0)],
    }),
    sprite('structure-pan-right', art.pan, s, CENTER + arm - panWidth / 2, panY, {
      track: (p) => ({ transform: hangFrom(balanceTilt(p), arm, drop) }),
      children: [grapesInPan('structure-grapes-right', grapes[looks.second.grapes], panWidth, panHeight, 0.08)],
    }),
    sprite('structure-beam', art.beam, s, CENTER - beamWidth / 2, pivotY - 0.5 * beamHeight, {
      track: (p) => ({ transform: `rotate(${num(balanceTilt(p))}deg)` }),
    }),
  ]
}

/* ── Taste quiz scenes ─────────────────────────────────────────────── */

const MAX_PICKS = 5

/** The pages of the flat journal art, as fractions of the art: the ribbon runs between them. */
const JOURNAL_PAGES = {
  left: [0.081, 0.478],
  right: [0.525, 0.908],
  top: 0.05,
  bottom: 0.825,
} as const
const JOURNAL_SCALE = 0.32
/** Each entry: a small sketch of the pick with one handwritten line beside it, three rows to a page. */
const SKETCH_SIZE = 16
const ROW_PITCH = 19.5
const ROW_PAD = 5
const NOTE_WIDTH = 20
const NOTE_HAND_SCALE = 0.13
const TITLE_HAND_SCALE = 0.16
/** Where each entry goes: page and row. The title takes the first row of the left page. */
const ENTRY_SLOTS = [
  ['left', 1],
  ['left', 2],
  ['right', 0],
  ['right', 1],
  ['right', 2],
] as const
/** A slight tilt, as a hand sketching on the page leaves it. */
const SKETCH_TILT = [-2, 1.5, -1, 2, -1.5] as const
/** The handwritten line written beside each entry. */
const NOTE_LINES = [1, 2, 3, 4, 5] as const
const ENTRY_START = 0.03
const ENTRY_STEP = 0.18
const SKETCH_DRAW = 0.1
const NOTE_HOP = 0.012
const NOTE_WRITE = 0.035
const PEN_LEAVE = [0.925, 1] as const
/** Pen strokes over one sketch: down, up, down; few and long, easing into each turn. */
const SKETCH_STROKES = 3
/** How much the drawing front leans, as a share of the sketch. */
const FRONT_SLANT = 0.3
const GATHER_PEN_SCALE = 0.17
const PEN_NIB = [0.06, 0.99] as const

interface Point {
  x: number
  y: number
}

const lerp = (from: Point, to: Point, t: number): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })

/** Gentle ease in and out over 0 to 1: the hand slows down at both ends of a stroke. */
const easeSine = (t: number) => (1 - Math.cos(Math.PI * t)) / 2

/** Eased progress between `start` and `end`, for a drawing or writing gesture the pen and its reveal share. */
const stroke = (p: number, start: number, end: number) => easeSine(between(p, start, end))

/** The drawing front at `k` (0 to 1 of the sketch): its top end, as a share of the width; it leans back by twice the slant at the bottom. */
const frontTop = (k: number) => k * (1 + 2 * FRONT_SLANT)

/** The nib hatching up and down the sketch along the drawing front, as fractions of the sketch. */
function hatch(k: number): Point {
  const strokes = Math.min(k * SKETCH_STROKES, SKETCH_STROKES)
  const index = Math.min(Math.floor(strokes), SKETCH_STROKES - 1)
  const along = easeSine(strokes - index)
  const y = index % 2 === 0 ? along : 1 - along
  return { x: clamp01(frontTop(k) - 2 * FRONT_SLANT * y), y }
}

/**
 * The member's picks are drawn into an open tasting journal, entry by entry: the fountain pen sketches
 * each pick in place, the drawing appearing where the nib passes, in sepia ink that warms into
 * watercolor, and then writes a line of notes beside it. Everything soaks into the paper.
 */
function gatherScene(picks: ScenePicks): SceneLayer[] {
  const journalWidth = art.journalFlat.w * JOURNAL_SCALE
  const journalHeight = art.journalFlat.h * JOURNAL_SCALE
  const journalX = (SCENE_SIZE - journalWidth) / 2
  const journalY = (SCENE_SIZE - journalHeight) / 2
  const pageTop = journalY + JOURNAL_PAGES.top * journalHeight
  const pageLeft = (page: 'left' | 'right') => journalX + JOURNAL_PAGES[page][0] * journalWidth
  const rowTop = (row: number) => pageTop + ROW_PAD + row * ROW_PITCH
  const handWidth = art.handwriting.w * NOTE_HAND_SCALE
  const handHeight = art.handwriting.h * NOTE_HAND_SCALE

  const entries = picks.map((src, index) => {
    const [page, row] = ENTRY_SLOTS[index]!
    const [top, bottom] = handwritingLines[NOTE_LINES[index]!]!
    const sketch = { x: pageLeft(page) + 3.5, y: rowTop(row) }
    const noteHeight = (bottom - top) * handHeight
    const note = { x: sketch.x + SKETCH_SIZE + 2, y: sketch.y + (SKETCH_SIZE - noteHeight) / 2 + 0.6, w: NOTE_WIDTH, h: noteHeight, top }
    const start = ENTRY_START + index * ENTRY_STEP
    const drawn = start + SKETCH_DRAW
    const writeStart = drawn + NOTE_HOP
    return { src, sketch, note, start, drawn, writeStart, written: writeStart + NOTE_WRITE }
  })

  const penWidth = art.pen.w * GATHER_PEN_SCALE
  const penHeight = art.pen.h * GATHER_PEN_SCALE
  const sketchPoint = (entry: (typeof entries)[number], point: Point): Point => ({
    x: entry.sketch.x + point.x * SKETCH_SIZE,
    y: entry.sketch.y + point.y * SKETCH_SIZE,
  })
  const noteStart = (entry: (typeof entries)[number]): Point => ({ x: entry.note.x, y: entry.note.y + entry.note.h / 2 })
  const noteEnd = (entry: (typeof entries)[number]): Point => ({ x: entry.note.x + entry.note.w, y: entry.note.y + entry.note.h / 2 })
  const away = { x: SCENE_SIZE + 6, y: journalY + journalHeight + 4 }

  const nib = (p: number): Point => {
    const first = entries[0]
    if (!first) return away
    const index = entries.findLastIndex((entry) => p >= entry.start)
    const entry = entries[Math.max(index, 0)]!
    if (p < entry.drawn) return sketchPoint(entry, hatch(stroke(p, entry.start, entry.drawn)))
    if (p < entry.writeStart) return lerp(sketchPoint(entry, hatch(1)), noteStart(entry), phase(p, entry.drawn, entry.writeStart))
    if (p < entry.written) {
      const k = stroke(p, entry.writeStart, entry.written)
      return { x: entry.note.x + entry.note.w * k, y: entry.note.y + entry.note.h / 2 + 0.5 * Math.sin(k * Math.PI * 8) }
    }
    const next = entries[index + 1]
    if (next) {
      const carry = phase(p, entry.written, next.start)
      const point = lerp(noteEnd(entry), sketchPoint(next, hatch(0)), carry)
      return { x: point.x, y: point.y - 3 * Math.sin(Math.PI * carry) }
    }
    return lerp(noteEnd(entry), away, phase(p, PEN_LEAVE[0], PEN_LEAVE[1]))
  }

  const titleBand = handwritingLines[0]
  const titleHeight = (titleBand[1] - titleBand[0]) * art.handwriting.h * TITLE_HAND_SCALE
  const titleX = pageLeft('left') + 3.5
  return [
    sprite('gather-journal', art.journalFlat, JOURNAL_SCALE, journalX, journalY),
    {
      id: 'gather-title',
      x: titleX,
      y: rowTop(0) + (SKETCH_SIZE - titleHeight) / 2,
      w: pageLeft('left') + (JOURNAL_PAGES.left[1] - JOURNAL_PAGES.left[0]) * journalWidth - 3 - titleX,
      h: titleHeight,
      clip: true,
      blend: 'multiply',
      opacity: 0.8,
      children: [
        {
          id: 'gather-title-ink',
          src: art.handwriting.src,
          x: 0,
          y: 0,
          w: art.handwriting.w * TITLE_HAND_SCALE,
          h: art.handwriting.h * TITLE_HAND_SCALE,
        },
      ],
    },
    ...entries.flatMap((entry, index): SceneLayer[] => [
      {
        id: `gather-pick-${index}`,
        src: entry.src,
        x: entry.sketch.x,
        y: entry.sketch.y,
        w: SKETCH_SIZE,
        h: SKETCH_SIZE,
        blend: 'multiply',
        track: (p) => {
          const top = frontTop(stroke(p, entry.start, entry.drawn)) * 100
          const bottom = top - 2 * FRONT_SLANT * 100
          const warm = phase(p, entry.drawn, entry.drawn + 0.2)
          return {
            opacity: '0.88',
            transform: `rotate(${num(SKETCH_TILT[index]!)}deg)`,
            'clip-path': `polygon(0% 0%, ${num(top)}% 0%, ${num(bottom)}% 100%, 0% 100%)`,
            filter: `sepia(${num(0.7 * (1 - warm))}) saturate(${num(0.55 + 0.45 * warm)})`,
          }
        },
      },
      {
        id: `gather-note-${index}`,
        ...entry.note,
        clip: true,
        blend: 'multiply',
        track: (p) => ({
          opacity: '0.9',
          'clip-path': `inset(0 ${num((1 - stroke(p, entry.writeStart, entry.written)) * 100)}% 0 0)`,
        }),
        children: [
          { id: `gather-note-${index}-ink`, src: art.handwriting.src, x: 0, y: -entry.note.top * handHeight, w: handWidth, h: handHeight },
        ],
      },
    ]),
    sprite('gather-pen', art.pen, GATHER_PEN_SCALE, 0, 0, {
      track: (p) => {
        const point = nib(p)
        return {
          opacity: num(1 - phase(p, PEN_LEAVE[0], PEN_LEAVE[1])),
          transform: `translate(${px(point.x - PEN_NIB[0] * penWidth)}, ${px(point.y - PEN_NIB[1] * penHeight)})`,
        }
      },
    }),
  ]
}

const FILL_START = 0.08
const FILL_END = 0.55
const FILL_WISP_START = 0.45
const FILL_WISP_STEP = 0.1

/** An empty glass fills with red wine, then its aromas rise in three wisps. */
function fillScene(): SceneLayer[] {
  const scale = 0.27
  const { glass } = glasses.bordeaux
  const width = glass.w * scale
  const height = glass.h * scale
  const x = (SCENE_SIZE - width) / 2
  const y = SCENE_SIZE - height - 6
  const rim = y + 0.12 * height
  const wispScale = 0.21
  return [
    filledGlass({ id: 'fill-glass', look: RED, scale, x, y, from: 0, to: 1, start: FILL_START, end: FILL_END }),
    ...wisps.map((wisp, index) => {
      const start = FILL_WISP_START + index * FILL_WISP_STEP
      return sprite(`fill-wisp-${index}`, wisp, wispScale, CENTER - (wisp.w * wispScale) / 2 + (index - 1) * 15, rim - wisp.h * wispScale, {
        track: (p) => ({
          opacity: num(0.8 * phase(p, start, start + 0.2)),
          transform: `translateY(${px(10 - 16 * settle(p, start, start + 0.35))})`,
        }),
      })
    }),
  ]
}

/** Wells of the watercolor palette, as fractions of the palette, and the middle where colors are mixed. */
const WELLS = {
  ruby: [0.353, 0.221],
  violet: [0.335, 0.732],
  mix: [0.5, 0.49],
} as const
/** The centre of the palette disc on its art, measured from the art's opaque pixels. */
const PALETTE_DISC_CENTER = [0.498, 0.498] as const
const BRUSH_SCALE = 0.16
/** The bristles' tip on the brush art, as fractions. */
const BRUSH_TIP = [0.03, 0.975] as const

interface Waypoint {
  at: number
  x: number
  y: number
}

/** A point moving from stop to stop, easing in and out of each one. */
function along(p: number, stops: readonly Waypoint[]): { x: number; y: number } {
  let from = stops[0]!
  for (const to of stops.slice(1)) {
    if (p < to.at) {
      const t = phase(p, from.at, to.at)
      return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
    }
    from = to
  }
  return { x: from.x, y: from.y }
}

/** A small circle stirred between `start` and `end`, opening and closing so it joins the path smoothly. */
function swirl(p: number, start: number, end: number, radius: number): { x: number; y: number } {
  const t = between(p, start, end)
  const r = radius * Math.sin(Math.PI * t)
  const angle = 3 * Math.PI * t
  return { x: r * Math.sin(angle), y: 0.6 * r * (1 - Math.cos(angle)) }
}

/** The brush art placed so its bristles' tip is at the given point. */
function brushAt(point: { x: number; y: number }): string {
  return `translate(${px(point.x - BRUSH_TIP[0] * art.brush.w * BRUSH_SCALE)}, ${px(point.y - BRUSH_TIP[1] * art.brush.h * BRUSH_SCALE)})`
}

/** The brush dips into the ruby and the violet wells and swirls each color into the middle of the palette. */
function blendScene(): SceneLayer[] {
  const scale = 0.36
  const width = art.palette.w * scale
  const height = art.palette.h * scale
  const x = CENTER - PALETTE_DISC_CENTER[0] * width
  const y = CENTER - PALETTE_DISC_CENTER[1] * height
  const well = ([fx, fy]: readonly [number, number]) => ({ x: x + fx * width, y: y + fy * height })
  const ruby = well(WELLS.ruby)
  const violet = well(WELLS.violet)
  const mix = well(WELLS.mix)
  const stops: Waypoint[] = [
    { at: 0, x: mix.x + 30, y: mix.y - 22 },
    { at: 0.12, ...ruby },
    { at: 0.2, ...ruby },
    { at: 0.28, ...mix },
    { at: 0.46, ...mix },
    { at: 0.54, ...violet },
    { at: 0.62, ...violet },
    { at: 0.68, ...mix },
    { at: 0.86, ...mix },
    { at: 1, x: mix.x + 16, y: mix.y + 18 },
  ]
  const dip = (p: number) => 1.6 * (Math.sin(Math.PI * between(p, 0.12, 0.2)) + Math.sin(Math.PI * between(p, 0.54, 0.62)))
  const blot = (index: number, color: string, size: number, dx: number, dy: number, start: number, end: number): SceneLayer => ({
    id: `blend-blot-${index}`,
    shape: 'blot',
    color,
    x: mix.x + dx - size / 2,
    y: mix.y + dy - size / 2,
    w: size,
    h: size,
    track: (p) => {
      const grow = settle(p, start, end)
      return { opacity: num(0.8 * grow), transform: `scale(${num(0.2 + 0.8 * grow)})` }
    },
  })
  return [
    sprite('blend-palette', art.palette, scale, x, y),
    blot(0, '#9E2A44', 20, -2, -1, 0.3, 0.46),
    blot(1, '#7D4F93', 16, 4, 3, 0.7, 0.86),
    sprite('blend-brush', art.brush, BRUSH_SCALE, 0, 0, {
      track: (p) => {
        const point = along(p, stops)
        const first = swirl(p, 0.28, 0.46, 5)
        const second = swirl(p, 0.68, 0.86, 5)
        return { transform: brushAt({ x: point.x + first.x + second.x, y: point.y + first.y + second.y + dip(p) }) }
      },
    }),
  ]
}

const PETALS = [art.petalRuby, art.petalRose, art.petalGold, art.petalSage, art.petalViolet, art.petalAmber]
const PETAL_SCALE = 0.15
/** The petal's pointed end on its art, as fractions: the petals are drawn pointing down. */
const PETAL_TIP = [0.485, 0.975] as const
const PETAL_START = 0.06
const PETAL_STEP = 0.135
const PETAL_PAINT = 0.1
const WHEEL_DONE = PETAL_START + (PETALS.length - 1) * PETAL_STEP + PETAL_PAINT

/**
 * Rotation by `degrees` and scaling around a pivot given relative to the layer's centre (where CSS
 * transforms turn): the pivot stays in place.
 */
function turnAround(degrees: number, scale: number, pivotX: number, pivotY: number): string {
  const angle = (degrees * Math.PI) / 180
  const dx = pivotX - scale * (pivotX * Math.cos(angle) - pivotY * Math.sin(angle))
  const dy = pivotY - scale * (pivotX * Math.sin(angle) + pivotY * Math.cos(angle))
  return `translate(${px(dx)}, ${px(dy)}) rotate(${num(degrees)}deg) scale(${num(scale)})`
}

/** The glass of red wine at the centre of the wheel, seen from above, and the gap between its rim and the petals. */
const WHEEL_GLASS_SIZE = 32
const WHEEL_GLASS_GAP = 3
const PETAL_RING = WHEEL_GLASS_SIZE / 2 + WHEEL_GLASS_GAP

/** The brush paints the taste wheel petal by petal around a glass of red wine seen from above; then the wine swirls. */
function paintScene(): SceneLayer[] {
  const reach = (index: number) => PETALS[index]!.h * PETAL_SCALE
  /** A point `distance` px out from the petal's pointed end along petal `index`, nudged `side` px across it. */
  const onPetal = (index: number, distance: number, side = 0) => {
    const angle = (index * 60 * Math.PI) / 180
    const out = PETAL_RING + distance
    return {
      x: CENTER + out * Math.sin(angle) + side * Math.cos(angle),
      y: CENTER - out * Math.cos(angle) + side * Math.sin(angle),
    }
  }
  const glassScale = WHEEL_GLASS_SIZE / art.glassTop.w
  const glassX = CENTER - WHEEL_GLASS_SIZE / 2
  const glassY = CENTER - (art.glassTop.h * glassScale) / 2
  const breathe = (p: number) => 1 + 0.06 * Math.sin(Math.PI * between(p, WHEEL_DONE, 1))
  const rest = { x: CENTER + 30, y: CENTER + 44 }
  const startPoint = onPetal(0, 0.2 * reach(0))

  const brush: Track = (p) => {
    if (p > 1) {
      const back = phase(p, 1, REPLAY_FADE_END)
      return { transform: brushAt({ x: rest.x + (startPoint.x - rest.x) * back, y: rest.y + (startPoint.y - rest.y) * back }) }
    }
    if (p >= WHEEL_DONE) {
      const end = onPetal(PETALS.length - 1, 0.92 * reach(PETALS.length - 1))
      const lift = phase(p, WHEEL_DONE, 1)
      return { transform: brushAt({ x: end.x + (rest.x - end.x) * lift, y: end.y + (rest.y - end.y) * lift }) }
    }
    const index = Math.min(Math.floor(Math.max(p - PETAL_START, 0) / PETAL_STEP), PETALS.length - 1)
    const start = PETAL_START + index * PETAL_STEP
    const k = phase(p, start, start + PETAL_PAINT)
    let point = onPetal(index, (0.2 + 0.72 * k) * reach(index), 2 * Math.sin(Math.PI * k))
    if (p > start + PETAL_PAINT && index < PETALS.length - 1) {
      const from = onPetal(index, 0.92 * reach(index))
      const to = onPetal(index + 1, 0.2 * reach(index + 1))
      const carry = phase(p, start + PETAL_PAINT, start + PETAL_STEP)
      point = { x: from.x + (to.x - from.x) * carry, y: from.y + (to.y - from.y) * carry }
    }
    return { transform: brushAt(point) }
  }

  return [
    ...PETALS.map((petal, index): SceneLayer => {
      const width = petal.w * PETAL_SCALE
      const height = petal.h * PETAL_SCALE
      const tipX = PETAL_TIP[0] * width
      const tipY = PETAL_TIP[1] * height
      const start = PETAL_START + index * PETAL_STEP
      const angle = (index * 60 * Math.PI) / 180
      const ring = `translate(${px(PETAL_RING * Math.sin(angle))}, ${px(-PETAL_RING * Math.cos(angle))})`
      return sprite(`paint-petal-${index}`, petal, PETAL_SCALE, CENTER - tipX, CENTER - tipY, {
        track: (p) => {
          const k = phase(p, start, start + PETAL_PAINT)
          return {
            opacity: num(1 - phase(p, 1, REPLAY_FADE_END)),
            transform: `${ring} ${turnAround(index * 60, 0.92 + 0.08 * k, tipX - width / 2, tipY - height / 2)}`,
            'clip-path': `inset(${num((1 - k) * 100)}% 0 0 0)`,
          }
        },
      })
    }),
    sprite('paint-glass', art.glassTop, glassScale, glassX, glassY, {
      track: (p) => ({ transform: `scale(${num(breathe(p))})` }),
    }),
    sprite('paint-glass-swirl', art.glassTopGarnet, glassScale, glassX, glassY, {
      track: (p) => {
        const swirl = phase(p, WHEEL_DONE, 1)
        return {
          opacity: num(swirl * (1 - phase(p, 1, REPLAY_FADE_END))),
          transform: `rotate(${num(-50 * (1 - swirl))}deg) scale(${num(breathe(p))})`,
        }
      },
    }),
    sprite('paint-brush', art.brush, BRUSH_SCALE, 0, 0, { track: brush }),
  ]
}

/** The layers of a scene for the given wines, or for the member's taste quiz picks. */
export function sceneLayers(scene: AiProcessSceneName, looks: WineSceneLooks, picks: ScenePicks = []): SceneLayer[] {
  switch (scene) {
    case 'uncork':
      return looks.first.bottle === 'sparkling' ? popScene(looks.first) : corkscrewScene(looks.first)
    case 'visual':
      return pourScene(looks.first)
    case 'bouquet':
      return bouquetScene(looks.first)
    case 'taste':
      return tasteScene(looks.first)
    case 'report':
    case 'recommendation':
      return writingScene()
    case 'compare':
      return compareScene(looks)
    case 'structure':
      return structureScene(looks)
    case 'contrast':
      return contrastScene(looks)
    case 'gather':
      return gatherScene(picks.slice(0, MAX_PICKS))
    case 'fill':
      return fillScene()
    case 'blend':
      return blendScene()
    case 'paint':
      return paintScene()
  }
}

/* ── Keyframes ─────────────────────────────────────────────────────── */

const SAMPLES = 40

/** Keyframe samples per gesture: the pen strokes over the journal sketches need finer sampling to stay crisp. */
export const SCENE_SAMPLES: Record<AiProcessSceneName, number> = {
  uncork: SAMPLES,
  visual: SAMPLES,
  bouquet: SAMPLES,
  taste: SAMPLES,
  report: SAMPLES,
  compare: SAMPLES,
  structure: SAMPLES,
  contrast: SAMPLES,
  recommendation: SAMPLES,
  gather: 240,
  fill: SAMPLES,
  blend: SAMPLES,
  paint: SAMPLES,
}
/** On the last step, while the answer is on its way: rest, then erase and write again. */
export const SCENE_ACTION_PAUSE_MS = 1600
const SCENE_ERASE_MS = 700

export interface SceneTiming {
  /** Total time of one run (one cycle when `waiting`). */
  durationMs: number
  /** Progress points paired with their keyframe offsets in percent. */
  points: Array<[progress: number, percent: number]>
}

/** Sample points of a gesture, played once or as the waiting loop (write, rest, erase). */
export function sceneTiming(actionMs: number, waiting: boolean, samples = SAMPLES): SceneTiming {
  const write = Array.from({ length: samples + 1 }, (_, index) => index / samples)
  if (!waiting) return { durationMs: actionMs, points: write.map((p) => [p, p * 100]) }
  const cycle = actionMs + SCENE_ACTION_PAUSE_MS + SCENE_ERASE_MS
  const at = (ms: number) => (ms / cycle) * 100
  const points: Array<[number, number]> = write.map((p) => [p, at(p * actionMs)])
  points.push([1, at(actionMs + SCENE_ACTION_PAUSE_MS)])
  for (let index = 1; index <= 8; index++) {
    const p = 1 + ((REPLAY_FADE_END - 1) * index) / 8
    points.push([p, at(actionMs + SCENE_ACTION_PAUSE_MS + (SCENE_ERASE_MS * index) / 8)])
  }
  return { durationMs: cycle, points }
}

function poseCss(pose: Pose): string {
  return Object.entries(pose)
    .map(([property, value]) => `${property}:${value}`)
    .join(';')
}

const stop = (percent: number, body: string) => `${Math.round(percent * 100) / 100}%{${body}}`

/**
 * CSS `@keyframes` for one track. A run of identical poses keeps only its
 * first and last stop, so a still layer does not drift between them.
 */
export function keyframesCss(name: string, track: Track, timing: SceneTiming): string {
  const stops: string[] = []
  let last = ''
  let held: string | null = null
  timing.points.forEach(([progress, percent], index) => {
    const body = poseCss(track(progress))
    const isLast = index === timing.points.length - 1
    if (index > 0 && body === last && !isLast) {
      held = stop(percent, body)
      return
    }
    if (held && body !== last) stops.push(held)
    held = null
    last = body
    stops.push(stop(percent, body))
  })
  return `@keyframes ${name}{${stops.join('')}}`
}

/** Keyframes of a looping motion over its whole period. */
export function loopKeyframesCss(name: string, track: Track): string {
  const stops = Array.from({ length: 21 }, (_, index) => index / 20).map((t) => `${t * 100}%{${poseCss(track(t))}}`)
  return `@keyframes ${name}{${stops.join('')}}`
}
