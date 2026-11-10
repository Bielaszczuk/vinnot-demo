/**
 * Geometry of the pour control, ported from the approved prototype: five
 * glasses in a row, a bottle above them whose lip follows the score and a
 * curved stream that lands in the glass being filled.
 */

import type { CSSProperties } from 'react'
import { RATING_GLASSES, RATING_MAX } from '@domain/wine/wine.rating'
import { BOTTLE_ART, GLASS_ART, type RatingLook } from './ratingLook'

/** Bottle angle while pouring and while resting above the glasses. */
export const POUR_ANGLE = 118
export const REST_ANGLE = 62

/**
 * Where the bottle mouth pours, as a fraction of the glass width: just inside the left end
 * of the rim (the rim of every glass art spans about 0.15–0.85 of its width).
 */
export const RIM_ENTRY = 0.21
/** Height of the bottle mouth, as a fraction of the glass height: just above the rim. */
const LIP_LEVEL = -0.02
/** Bottle height, in glass heights. */
const BOTTLE_SCALE = 1.3
/** Room left of the standing bottle and between it and the first glass, in glass heights. */
const STAND_PAD = 0.2
const STAND_GAP = 0.45

export interface PourLayout {
  width: number
  height: number
  /** Margin before the rail: the stand where the bottle waits upright. */
  side: number
  /** Width the score maps to, from 0 at the left to 5 at the right. */
  inner: number
  slot: number
  glassWidth: number
  glassHeight: number
  /** Top of the glasses. */
  top: number
  bottleWidth: number
  bottleHeight: number
}

export interface BottlePose {
  left: number
  top: number
  rotate: number
  /** SVG path of the stream from the lip to the wine level. */
  stream: string
  /** Index of the glass being poured into. */
  glass: number
}

/** Glass heights per control size: about the size of the star row it replaced. */
export const POUR_GLASS_HEIGHT = { md: 46, lg: 56 } as const
export type PourSize = keyof typeof POUR_GLASS_HEIGHT

export function pourLayout(glassHeight: number, look: RatingLook): PourLayout {
  const glass = GLASS_ART[look.glass]
  const bottle = BOTTLE_ART[look.bottle]
  const slot = glassHeight * 0.8
  const inner = slot * RATING_GLASSES
  const bottleHeight = glassHeight * BOTTLE_SCALE
  const bottleWidth = (bottleHeight * bottle.width) / bottle.height
  const side = glassHeight * (STAND_PAD + STAND_GAP) + bottleWidth
  // Room above the rims for the tilted bottle, whose mouth rests just above a rim.
  const top = glassHeight * 0.9
  return {
    width: Math.floor(side + inner),
    // Below the glasses: room for the standing bottle's shadow.
    height: Math.round(top + glassHeight + 8),
    side,
    inner,
    slot,
    glassWidth: (glassHeight * glass.width) / glass.height,
    glassHeight,
    top,
    bottleWidth,
    bottleHeight,
  }
}

export type BottleStage = 'corked' | 'pouring' | 'finished'

/** Not rated yet: corked on its stand. Rated: pouring. 5.0: back on its stand, open and empty. */
export function bottleStage(value: number): BottleStage {
  if (value <= 0) return 'corked'
  return value >= RATING_MAX ? 'finished' : 'pouring'
}

/** The bottle upright on its stand, left of the first glass, on the glasses' base line. */
export function standPose(layout: PourLayout): Pick<BottlePose, 'left' | 'top' | 'rotate'> {
  const round = (n: number) => Math.round(n * 10) / 10
  return {
    left: round(layout.glassHeight * STAND_PAD),
    top: round(layout.top + layout.glassHeight - layout.bottleHeight),
    rotate: 0,
  }
}

/** The cork inside the bottle box (origin at its top left, upright), centred in the mouth. */
export function corkBox(layout: PourLayout, look: RatingLook) {
  const bottle = BOTTLE_ART[look.bottle]
  const { cork } = bottle
  const width = layout.bottleWidth * cork.size
  const height = (width * cork.height) / cork.width
  const lipX = (bottle.lip[0] / bottle.width) * layout.bottleWidth
  const lipY = (bottle.lip[1] / bottle.height) * layout.bottleHeight
  return { left: lipX - width / 2, top: lipY - height * (1 - cork.inNeck), width, height }
}

/** Left edge of glass `index` inside the control. */
export function glassLeft(layout: PourLayout, index: number): number {
  return layout.side + index * layout.slot + (layout.slot - layout.glassWidth) / 2
}

/** Raw score under a horizontal position inside the control (not yet snapped). */
export function ratingAtX(x: number, layout: PourLayout): number {
  return ((x - layout.side) / layout.inner) * RATING_MAX
}

/**
 * Bottle placement, like real pouring: the bottle sits over the glass being filled with its
 * mouth just above the left rim, and moves on to the next glass when this one is full.
 */
export function bottlePose(value: number, layout: PourLayout, look: RatingLook, pouring: boolean): BottlePose {
  const glass = GLASS_ART[look.glass]
  const bottle = BOTTLE_ART[look.bottle]
  const [boxX, boxY, boxW, boxH] = glass.box
  const target = Math.min(RATING_GLASSES - 1, Math.max(0, Math.floor(value - 1e-6)))
  const fill = Math.min(1, Math.max(0, value - target))
  const left = glassLeft(layout, target)
  // At 0 nothing is poured: the bottle waits at the start of the rail.
  const lipX = value > 0 ? left + RIM_ENTRY * layout.glassWidth : layout.side
  const lipY = layout.top + LIP_LEVEL * layout.glassHeight
  // The wine runs down the near side of the bowl, which narrows towards the bottom, so the
  // stream lands closer to the centre the lower the wine is.
  const centre = boxX + boxW / 2
  const reach = 0.75 - 0.65 * fill
  const tx = left + (RIM_ENTRY + (centre - RIM_ENTRY) * reach) * layout.glassWidth
  const ty = layout.top + (boxY + boxH * (1 - fill)) * layout.glassHeight
  // The bottle turns on its centre, placed so that at the pouring angle its lip sits at (lipX, lipY).
  const angle = (POUR_ANGLE * Math.PI) / 180
  const ox = (bottle.lip[0] / bottle.width - 0.5) * layout.bottleWidth
  const oy = (bottle.lip[1] / bottle.height - 0.5) * layout.bottleHeight
  const cx = lipX - (ox * Math.cos(angle) - oy * Math.sin(angle))
  const cy = lipY - (ox * Math.sin(angle) + oy * Math.cos(angle))
  const round = (n: number) => Math.round(n * 10) / 10
  return {
    left: round(cx - layout.bottleWidth / 2),
    top: round(cy - layout.bottleHeight / 2),
    rotate: pouring ? POUR_ANGLE : REST_ANGLE,
    // Falls almost straight in past the rim, then follows the wall towards the wine.
    stream: `M${round(lipX)},${round(lipY)} Q${round(lipX + (tx - lipX) * 0.25)},${round(lipY + (ty - lipY) * 0.7)} ${round(tx)},${round(ty)}`,
    glass: target,
  }
}

/**
 * Height of the wine surface, in the frame of the bottle centre's `centerY`. The surface stays level
 * whatever the bottle's angle: it rises from the lowest point of the wine space (the base upright,
 * the neck once turned past horizontal) by the share of wine left, `remaining` (1 full, 0 empty).
 */
export function wineSurfaceY(
  centerY: number, angle: number, remaining: number, layout: PourLayout, look: RatingLook,
): number {
  const [top, bottom] = BOTTLE_ART[look.bottle].wine
  const a = (angle * Math.PI) / 180
  const sin = Math.sin(a)
  const cos = Math.cos(a)
  let minY = Infinity
  let maxY = -Infinity
  for (const fx of [-0.5, 0.5]) {
    for (const fy of [top - 0.5, bottom - 0.5]) {
      const y = centerY + fx * layout.bottleWidth * sin + fy * layout.bottleHeight * cos
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
  return maxY - Math.min(1, Math.max(0, remaining)) * (maxY - minY)
}

/**
 * CSS clip for the full bottle, in the bottle box's own pixels (origin at its top left, upright):
 * the part of the box below the level wine surface for the bottle turned by `angle` degrees.
 */
export function bottleWineClip(angle: number, remaining: number, layout: PourLayout, look: RatingLook): string {
  const level = wineSurfaceY(0, angle, remaining, layout, look)
  const a = (angle * Math.PI) / 180
  const sin = Math.sin(a)
  const cos = Math.cos(a)
  const w = layout.bottleWidth / 2
  const h = layout.bottleHeight / 2
  // How far below the surface a point of the box (centred, upright) ends up once turned.
  const below = ([x, y]: readonly [number, number]) => x * sin + y * cos - level
  const corners: [number, number][] = [[-w, -h], [w, -h], [w, h], [-w, h]]
  const points: [number, number][] = []
  corners.forEach((point, index) => {
    const next = corners[(index + 1) % corners.length]!
    const here = below(point)
    const there = below(next)
    if (here >= 0) points.push([point[0], point[1]])
    if ((here > 0 && there < 0) || (here < 0 && there > 0)) {
      const t = here / (here - there)
      points.push([point[0] + (next[0] - point[0]) * t, point[1] + (next[1] - point[1]) * t])
    }
  })
  if (points.length < 3) return 'polygon(0px 0px, 0px 0px, 0px 0px)'
  const round = (n: number) => Math.round(n * 10) / 10
  return `polygon(${points.map(([x, y]) => `${round(x + w)}px ${round(y + h)}px`).join(', ')})`
}

/** 0 before `start`, 1 after `end`, eased in and out between them (as the AI profile scenes). */
function phase(value: number, start: number, end: number) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)))
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** 0 before `start`, 1 after `end`, slowing down like an object coming to rest. */
function settle(value: number, start: number, end: number) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)))
  return 1 - Math.pow(1 - t, 3)
}

/** Offsets and opacity of one prop of the uncorking, in pixels and degrees. */
export interface UncorkPart {
  dx: number
  dy: number
  rotate: number
  scaleX: number
  opacity: number
}

const part = (dx: number, dy: number, rotate: number, scaleX: number, opacity: number): UncorkPart => ({
  dx, dy, rotate, scaleX, opacity,
})

/**
 * The uncorking of the AI profile scene at `progress` (0..1), with its stage units scaled by
 * `scale`. Still wine: a corkscrew turns into the cork and pulls it out, and the aroma escapes.
 * Sparkling: the cage comes off, the cork wiggles loose and pops, and foam wells up. Every prop
 * is gone at the end, so the bottle can be lifted.
 */
export function uncorkScene(progress: number, kind: 'still' | 'sparkling', scale: number) {
  const p = progress
  if (kind === 'still') {
    const turns = 1.5 * Math.min(1, Math.max(0, (p - 0.04) / 0.42))
    const pull = -20 * scale * settle(p, 0.5, 0.8)
    const leave = 1 - phase(p, 0.66, 0.86)
    const wisp = p < 0.72 ? 0 : p < 0.84 ? (0.7 * (p - 0.72)) / 0.12 : (0.7 * (1 - p)) / 0.16
    return {
      cork: part(0, pull, 0, 1, leave),
      screw: part(0, 14 * scale * phase(p, 0.04, 0.46) + pull, 0, Math.cos(turns * 2 * Math.PI), phase(p, 0, 0.04) * leave),
      wisp: part(0, -18 * scale * phase(p, 0.72, 1), 0, 1, Math.max(0, wisp)),
      cage: part(0, 0, 0, 1, 0),
      foam: part(0, 0, 0, 0, 0),
    }
  }
  const off = phase(p, 0.06, 0.36)
  const wiggle = p < 0.58 ? 7 * Math.sin(phase(p, 0.38, 0.58) * 6 * Math.PI) : 0
  const flight = settle(p, 0.58, 0.82)
  const up = settle(p, 0.6, 0.86)
  return {
    cork: part(10 * scale * flight, -70 * scale * flight, wiggle + 220 * flight, 1, 1 - phase(p, 0.74, 0.84)),
    cage: part(16 * scale * off, -12 * scale * off, 28 * off, 1, 1 - phase(p, 0.24, 0.4)),
    // Foam rises and grows (scaleX carries its size), then settles back before the bottle is lifted.
    foam: part(0, -9 * scale * up, 0, 0.3 + 0.7 * up, up * (1 - phase(p, 0.9, 1))),
    screw: part(0, 0, 0, 1, 0),
    wisp: part(0, 0, 0, 1, 0),
  }
}

/** The uncorking of the AI profile scene, in milliseconds; it plays on its own when the control opens unrated. */
export const UNCORK_MS = 2200

/*
 * The drag demo for new raters, in milliseconds: a hand fades in over the standing bottle,
 * drags right over the glasses while they fill faintly, then fades as the preview drains,
 * and after a pause it starts again.
 */
export const GHOST_FADE_IN_MS = 300
export const GHOST_SLIDE_MS = 1600
export const GHOST_DRAIN_MS = 600
export const GHOST_PAUSE_MS = 1200
export const GHOST_CYCLE_MS = GHOST_FADE_IN_MS + GHOST_SLIDE_MS + GHOST_DRAIN_MS + GHOST_PAUSE_MS
/** The demo pours up to the middle of the glasses. */
export const GHOST_TARGET = 2.5

export interface GhostFrame {
  /** 0 on the stand beside the real bottle, 1 held over the glasses. */
  held: number
  opacity: number
  /** Score previewed in the glasses. */
  score: number
}

/**
 * The drag demo `elapsed` ms after it started; it repeats every `GHOST_CYCLE_MS`. A see-through
 * copy of the bottle appears on the stand, glides over the glasses pouring up to the middle,
 * then fades while they drain.
 */
export function ghostFrame(elapsed: number): GhostFrame {
  const t = ((elapsed % GHOST_CYCLE_MS) + GHOST_CYCLE_MS) % GHOST_CYCLE_MS
  const slideEnd = GHOST_FADE_IN_MS + GHOST_SLIDE_MS
  const held = phase(t, GHOST_FADE_IN_MS, slideEnd)
  const drain = phase(t, slideEnd, slideEnd + GHOST_DRAIN_MS)
  return {
    held: Math.round(held * 1000) / 1000,
    opacity: Math.round(Math.min(1, t / GHOST_FADE_IN_MS) * (1 - drain) * 100) / 100,
    score: Math.round(GHOST_TARGET * held * (1 - drain) * 100) / 100,
  }
}

/*
 * The slider bar under the glasses: a small glass, centred on a track like a slider thumb, slides
 * on its own straight scale where each whole score sits under the centre of its glass, so a full
 * bar ends under the last glass, which is then full too. 0 is one glass slot before the first
 * glass, over the bottle stand.
 */
/** Height of the glass that slides along the bar. */
export const BAR_GLASS_HEIGHT = 38
/** Thickness of the track that runs through the middle of the glass. */
export const BAR_TRACK = 5

export interface BarLayout {
  /** Wide enough for the glass at 5, whose centre is at the end of the track. */
  width: number
  height: number
  glassWidth: number
  glassHeight: number
  /** Top of the track, centred on the glass. */
  trackTop: number
  /** The track, in control coordinates: from the score 0 to the score 5 (the last glass centre). */
  trackLeft: number
  trackWidth: number
}

export function barLayout(layout: PourLayout, look: RatingLook): BarLayout {
  const glass = GLASS_ART[look.glass]
  const glassHeight = BAR_GLASS_HEIGHT
  const glassWidth = (glassHeight * glass.width) / glass.height
  const trackLeft = barXAtRating(0, layout)
  const trackEnd = barXAtRating(RATING_MAX, layout)
  return {
    width: Math.ceil(trackEnd + glassWidth / 2),
    height: glassHeight,
    glassWidth,
    glassHeight,
    trackTop: (glassHeight - BAR_TRACK) / 2,
    trackLeft,
    trackWidth: trackEnd - trackLeft,
  }
}

/** Centre of glass `index` (0..4) inside the control. */
function glassCentre(layout: PourLayout, index: number): number {
  return glassLeft(layout, index) + layout.glassWidth / 2
}

/** Position of a score on the bar, held at 0 and 5: whole scores sit under their glass centres. */
export function barXAtRating(value: number, layout: PourLayout): number {
  const score = Math.min(RATING_MAX, Math.max(0, value))
  return glassCentre(layout, 0) + (score - 1) * layout.slot
}

/** Raw score under a position on the bar (not yet snapped), held at 0 and 5; the inverse of `barXAtRating`. */
export function ratingAtBarX(x: number, layout: PourLayout): number {
  return Math.min(RATING_MAX, Math.max(0, (x - glassCentre(layout, 0)) / layout.slot + 1))
}

/** Left edge of the bar's glass for a score, centred at its place on the bar. */
export function barThumbLeft(value: number, layout: PourLayout, bar: BarLayout): number {
  return barXAtRating(value, layout) - bar.glassWidth / 2
}

/**
 * Inline style of the bar's wine fill, from the start of the track up to the glass (empty when
 * not rated); its gradient stops go in as CSS custom properties.
 */
export function trackStyle(value: number, layout: PourLayout, bar: BarLayout, look: RatingLook): CSSProperties {
  const width = value > 0 ? barXAtRating(value, layout) - bar.trackLeft : 0
  return {
    top: bar.trackTop,
    left: bar.trackLeft,
    width,
    '--vp-bar-from': look.track[0],
    '--vp-bar-to': look.track[1],
  } as CSSProperties
}
