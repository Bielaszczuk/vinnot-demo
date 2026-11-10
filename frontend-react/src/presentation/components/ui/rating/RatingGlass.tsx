/**
 * RatingGlass — one watercolor glass filled from 0 (empty) to 1 (full).
 * Shared by the display row and the pour control.
 */

import type { CSSProperties } from 'react'
import { GLASS_ART, glassImage, surfaceClip, wineClip, wineImage, type RatingLook } from './ratingLook'

interface RatingGlassProps {
  look: RatingLook
  fill: number
  height: number
  /** Thin bright band at the wine surface (pour control only). */
  surface?: boolean
  bubbles?: boolean
  style?: CSSProperties
  onPointerDown?: () => void
}

const BUBBLES = 4

export function RatingGlass({ look, fill, height, surface = false, bubbles = false, style, onPointerDown }: RatingGlassProps) {
  const art = GLASS_ART[look.glass]
  const width = (height * art.width) / art.height
  const [boxX, boxY, boxW, boxH] = art.box
  const showBubbles = bubbles && look.glass === 'flute' && fill > 0.15
  return (
    <span
      className="vinnot-glass"
      data-fill={fill}
      style={{ width, height, ...style }}
      onPointerDown={onPointerDown}
    >
      <img src={glassImage(look.glass)} alt="" draggable={false} />
      <img className="vg-wine" src={wineImage(look.wine)} alt="" draggable={false} style={{ clipPath: wineClip(art.box, fill) }} />
      {surface && (
        <img className="vg-surface" src={wineImage(look.wine)} alt="" draggable={false} style={{ clipPath: surfaceClip(art.box, fill) }} />
      )}
      {showBubbles && Array.from({ length: BUBBLES }, (_, index) => (
        <i
          key={index}
          className="vg-bubble"
          style={{
            left: `${(boxX + boxW * (0.25 + index * 0.17)) * 100}%`,
            top: `${(boxY + boxH * 0.95) * 100}%`,
            animationDelay: `${index * 0.45}s`,
            '--h': `${height * boxH * 0.8 * fill}px`,
          } as CSSProperties}
        />
      ))}
    </span>
  )
}
