/**
 * Motion data for the wax seals, ported from the approved prototype: where
 * each tier's sparkles twinkle and the holographic particles that rise from
 * the top seal. Positions are percentages of the seal box.
 */

import type { BadgeTier } from '@domain/points/points.types'
import { tierSlug } from '@domain/points/points.tiers'

/** `[left %, top %, size %, delay s]` */
type SparkSpec = readonly [number, number, number, number]

const SPARKS: Partial<Record<BadgeTier, readonly SparkSpec[]>> = {
  VENDIMIA: [[70, 32, 16, 0.9]],
  GRAN_RESERVA: [[22, 26, 15, 0], [80, 30, 12, 1.1], [70, 80, 14, 1.9]],
  GRAN_ENOFILO: [[24, 22, 14, 0], [82, 26, 12, 0.7], [78, 78, 15, 1.4], [20, 74, 11, 2.1], [52, 10, 10, 1.7]],
  VINNOT: [[18, 22, 15, 0], [84, 24, 13, 0.6], [86, 72, 14, 1.3], [16, 70, 12, 1.9], [50, 6, 11, 1.1], [62, 92, 10, 2.4]],
}

const HOLO = ['#ff7ad1', '#ffd27a', '#8affc1', '#79d3ff', '#b78bff']
const SPARK_COLOR: Partial<Record<BadgeTier, string>> = {
  VENDIMIA: '#fff8e0',
  GRAN_RESERVA: '#ffe39a',
  GRAN_ENOFILO: '#d8ecff',
}

/** Sparkles read as noise below this size, so list seals skip them. */
export const SPARKLE_MIN_SIZE = 40
/** Tilt and pointer-following foil only where the seal is big enough to hover. */
export const TILT_MIN_SIZE = 60

/** List seals replay their burst every 8–16 s while visible. */
export function replayDelay(random: () => number = Math.random): number {
  return 8000 + random() * 8000
}

export interface Sparkle {
  kind: 'spark' | 'dot'
  style: Record<string, string>
}

/** Small deterministic noise, so particles keep their places between renders. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export function sealSparkles(tier: BadgeTier, size: number): Sparkle[] {
  const specs = SPARKS[tier]
  if (!specs || size < SPARKLE_MIN_SIZE) return []
  const icon = tier === 'VINNOT'
  const sparks: Sparkle[] = specs.map(([x, y, z, delay], index) => ({
    kind: 'spark',
    style: {
      left: `${x}%`,
      top: `${y}%`,
      '--z': `${z}%`,
      '--dl': `${delay}s`,
      '--d': `${tier === 'VENDIMIA' ? 3.8 : 2.4 + (index % 3) * 0.5}s`,
      '--c': icon ? HOLO[index % HOLO.length]! : SPARK_COLOR[tier]!,
    },
  }))
  if (!icon) return sparks
  const dots: Sparkle[] = Array.from({ length: 9 }, (_, index) => ({
    kind: 'dot',
    style: {
      left: `${(22 + noise(index + 1) * 56).toFixed(1)}%`,
      top: `${(70 + noise(index + 11) * 18).toFixed(1)}%`,
      '--z': `${(2.5 + noise(index + 21) * 2.5).toFixed(2)}%`,
      '--c': HOLO[index % HOLO.length]!,
      '--dl': `${(index * 0.45).toFixed(2)}s`,
      '--d': `${(2.8 + noise(index + 31) * 1.6).toFixed(2)}s`,
      '--rise': `${Math.round(size * (0.45 + noise(index + 41) * 0.35))}px`,
      '--dx': `${Math.round((noise(index + 51) - 0.5) * size * 0.25)}px`,
    },
  }))
  return [...sparks, ...dots]
}

/** Public URL of a tier's seal art. */
export function sealImage(tier: BadgeTier): string {
  return `/images/emblems/${tierSlug(tier)}.webp`
}
