/**
 * The watercolor AI loading scenes as data: layers on a 128 px stage, each
 * with an optional motion track. A track maps the gesture's progress (0 the
 * starting pose, 1 the finished gesture, up to 1.25 while a replay erases the
 * page) to CSS properties; `AiProcessSceneArt` samples tracks into CSS
 * keyframes. The composition mirrors the app's `WineProcessSceneArt`.
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
import magnifierImage from '@assets/loading/magnifier.webp'
import paperImage from '@assets/loading/paper.webp'
import penImage from '@assets/loading/pen.webp'
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
}

/** Scenes whose gesture plays again on the last step while the answer is pending. */
export const REPLAYABLE_SCENES: ReadonlySet<AiProcessSceneName> = new Set(['report', 'recommendation'])

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
export type Pose = Partial<Record<'opacity' | 'transform' | 'clip-path' | 'top' | 'height', string>>
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
  shape?: 'stream' | 'bubble' | 'foam'
  color?: string
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

/** The layers of a scene for the given wines. */
export function sceneLayers(scene: AiProcessSceneName, looks: WineSceneLooks): SceneLayer[] {
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
  }
}

/* ── Keyframes ─────────────────────────────────────────────────────── */

const SAMPLES = 40
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
export function sceneTiming(actionMs: number, waiting: boolean): SceneTiming {
  const write = Array.from({ length: SAMPLES + 1 }, (_, index) => index / SAMPLES)
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
