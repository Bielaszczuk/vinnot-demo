/**
 * Watercolor art for the glass rating: which glass, wine layer and bottle a
 * wine type uses (the same choice as the AI profile scenes), the art geometry
 * and the clip paths that fill a glass by fraction.
 */

import corkStillImage from '@assets/loading/cork.webp'
import corkSparklingImage from '@assets/loading/cork-sparkling.webp'
import cageImage from '@assets/loading/cage.webp'
import corkscrewImage from '@assets/loading/corkscrew.webp'
import wispImage from '@assets/loading/wisp-2.webp'
import type { WineType } from '@domain/wine/wine.types'

export type RatingGlass = 'bordeaux' | 'rose' | 'tulip' | 'flute'
export type RatingWine = 'red' | 'ruby' | 'rose' | 'white' | 'amber' | 'sparkling'
export type RatingBottle = 'dark' | 'clear-white' | 'clear-rose' | 'clear-amber' | 'sparkling'

/** `[x, y, width, height]` as fractions of the image; wine is uncovered from the bottom of the box up. */
export type WineBox = readonly [number, number, number, number]

export interface GlassArt {
  width: number
  height: number
  box: WineBox
}

export interface CorkArt {
  src: string
  width: number
  height: number
  /** Cork width as a fraction of the bottle width. */
  size: number
  /** Share of the cork height that sits inside the neck. */
  inNeck: number
  /** How it comes out, as in the AI profile scene. */
  kind: 'still' | 'sparkling'
}

export interface BottleArt {
  width: number
  height: number
  /** Pouring lip in image pixels. */
  lip: readonly [number, number]
  cork: CorkArt
  /** Where the wine sits when the bottle is full, as fractions of its height: shoulder and base. */
  wine: readonly [number, number]
}

/** A plain watercolor layer: source and pixel size. */
export interface SceneArt {
  src: string
  width: number
  height: number
}

/** Props of the uncorking from the AI profile scene: the corkscrew for still wine, the cage for sparkling. */
export const UNCORK_ART = {
  corkscrew: { src: corkscrewImage, width: 224, height: 273 },
  cage: { src: cageImage, width: 135, height: 149 },
  wisp: { src: wispImage, width: 45, height: 150 },
} satisfies Record<string, SceneArt>

const STILL_CORK: CorkArt = { src: corkStillImage, width: 76, height: 172, size: 0.26, inNeck: 0.5, kind: 'still' }
const SPARKLING_CORK: CorkArt = { src: corkSparklingImage, width: 113, height: 160, size: 0.42, inNeck: 0.3, kind: 'sparkling' }

export interface RatingLook {
  glass: RatingGlass
  wine: RatingWine
  bottle: RatingBottle
  /** Colour of the stream poured into the glass. */
  pour: string
  /** Gradient of the slider bar's wine track, from the deepest hue to the rim. */
  track: readonly [string, string]
}

export const GLASS_ART: Record<RatingGlass, GlassArt> = {
  bordeaux: { width: 177, height: 360, box: [0.027, 0.2009, 0.9459, 0.2939] },
  rose: { width: 172, height: 360, box: [0.0279, 0.1967, 0.9443, 0.2885] },
  tulip: { width: 148, height: 360, box: [0.0289, 0.2128, 0.9386, 0.2872] },
  flute: { width: 122, height: 360, box: [0.1261, 0.1512, 0.7478, 0.3774] },
}

export const BOTTLE_ART: Record<RatingBottle, BottleArt> = {
  dark: { width: 104, height: 360, lip: [51.7, 3.6], cork: STILL_CORK, wine: [0.3, 0.97] },
  'clear-white': { width: 105, height: 360, lip: [52.2, 3.6], cork: STILL_CORK, wine: [0.28, 0.97] },
  'clear-rose': { width: 105, height: 360, lip: [51.9, 3.6], cork: STILL_CORK, wine: [0.28, 0.97] },
  'clear-amber': { width: 106, height: 360, lip: [52.3, 3.6], cork: STILL_CORK, wine: [0.28, 0.97] },
  sparkling: { width: 116, height: 360, lip: [55.7, 3.6], cork: SPARKLING_CORK, wine: [0.35, 0.97] },
}

export const POUR_COLORS: Record<RatingWine, string> = {
  red: '#7A1F2E',
  ruby: '#8E2A36',
  rose: '#E39A8E',
  white: '#E3CF7C',
  amber: '#D08A3A',
  sparkling: '#E8C860',
}

/** Like the grape pills of the mobile home: the wine's deepest hue to its rim. */
export const TRACK_GRADIENTS: Record<RatingWine, readonly [string, string]> = {
  red: ['#2A0A3B', '#7E1A47'],
  ruby: ['#5A1027', '#9E2338'],
  rose: ['#C9606B', '#F0B0A4'],
  white: ['#F6DE92', '#E4B654'],
  amber: ['#9A5A1E', '#D9A04F'],
  sparkling: ['#F3E3A0', '#E2C25A'],
}

function look(glass: RatingGlass, wine: RatingWine, bottle: RatingBottle): RatingLook {
  return { glass, wine, bottle, pour: POUR_COLORS[wine], track: TRACK_GRADIENTS[wine] }
}

const RED = look('bordeaux', 'red', 'dark')

const LOOKS: Record<WineType, RatingLook> = {
  red: RED,
  fortified: look('bordeaux', 'ruby', 'dark'),
  rose: look('rose', 'rose', 'clear-rose'),
  white: look('tulip', 'white', 'clear-white'),
  orange: look('tulip', 'amber', 'clear-amber'),
  dessert: look('tulip', 'amber', 'clear-amber'),
  sparkling: look('flute', 'sparkling', 'sparkling'),
}

/** The look of a wine's rating; a red wine until its type is known. Accepts API casing (`RED`). */
export function ratingLook(type?: WineType | string | null): RatingLook {
  return (type && LOOKS[type.toLowerCase() as WineType]) || RED
}

const ART_BASE = '/images/rating'

export const glassImage = (glass: RatingGlass) => `${ART_BASE}/glass-${glass}.webp`
export const wineImage = (wine: RatingWine) => `${ART_BASE}/wine-${wine}.webp`
export const bottleImage = (bottle: RatingBottle) => `${ART_BASE}/bottle-${bottle}.webp`
/** The same bottle with no wine left: same size, label and neck, so the two can be cut at the wine level. */
export const emptyBottleImage = (bottle: RatingBottle) => `${ART_BASE}/bottle-${bottle}-empty.webp`

/** Top of the wine level, as a percentage of the image height, for a fill from 0 to 1. */
function levelTop(box: WineBox, fill: number): number {
  const [, y, , h] = box
  return (y + h * (1 - fill)) * 100
}

/** Clip that shows the wine layer from the bottom of its box up to the level. */
export function wineClip(box: WineBox, fill: number): string {
  return `inset(${levelTop(box, fill).toFixed(2)}% 0 0 0)`
}

/** Clip for the thin bright band at the surface of the wine; hidden when empty. */
export function surfaceClip(box: WineBox, fill: number): string {
  if (fill <= 0) return 'inset(100% 0 0 0)'
  const top = levelTop(box, fill)
  return `inset(${top.toFixed(2)}% 0 ${(100 - top - 1.4).toFixed(2)}% 0)`
}
