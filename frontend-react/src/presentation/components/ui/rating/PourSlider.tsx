/**
 * PourSlider — the bar under the glasses: a small glass of the wine type, centred on a track like a slider thumb,
 * slides from 0 over the bottle stand to 5 under the last glass, each whole score under its glass,
 * filling as the score rises while the track fills with wine up to it. Dragging or clicking it rates through the pour control, so the bottle above
 * pours as when it is dragged. It is a second way to point, not a second slider: assistive tech
 * and the keyboard use the pour control, so the bar is hidden from them.
 */

import { useRef, type PointerEvent } from 'react'
import { RATING_MAX } from '@domain/wine/wine.rating'
import type { RatingLook } from './ratingLook'
import { barLayout, barThumbLeft, ratingAtBarX, trackStyle, type PourLayout } from './pourGeometry'
import { PourBarGhost } from './PourGhost'
import { RatingGlass } from './RatingGlass'

interface PourSliderProps {
  look: RatingLook
  value: number
  /** Layout of the glasses above: the bar lines its scores up with their centres. */
  layout: PourLayout
  disabled: boolean
  /** Plays the drag demo on the bar too. */
  demo: boolean
  /** The bar was touched: the control stops guiding. */
  onTouch: () => void
  /** Raw score under the pointer; the control snaps and clamps it. */
  onRate: (raw: number) => void
}

export function PourSlider({ look, value, layout, disabled, demo, onTouch, onRate }: PourSliderProps) {
  const bar = barLayout(layout, look)
  const dragging = useRef(false)

  const fromPointer = (event: PointerEvent<HTMLDivElement>) =>
    ratingAtBarX(event.clientX - event.currentTarget.getBoundingClientRect().left, layout)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    onTouch()
    dragging.current = true
    event.currentTarget.setPointerCapture?.(event.pointerId)
    onRate(fromPointer(event))
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current && !disabled) onRate(fromPointer(event))
  }
  const endDrag = () => {
    dragging.current = false
  }

  return (
    <div
      className="vinnot-pour-bar"
      style={{ width: bar.width, height: bar.height }}
      aria-hidden="true"
      data-testid="pour-bar"
      data-disabled={disabled || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <span className="vp-bar-track" style={{ top: bar.trackTop, left: bar.trackLeft, width: bar.trackWidth }} />
      <span className="vp-bar-fill" style={trackStyle(value, layout, bar, look)} />
      {demo && <PourBarGhost layout={layout} bar={bar} look={look} />}
      <span className="vp-bar-thumb" style={{ left: barThumbLeft(value, layout, bar) }}>
        <RatingGlass look={look} fill={Math.round(Math.min(1, Math.max(0, value / RATING_MAX)) * 100) / 100} height={bar.glassHeight} surface />
      </span>
    </div>
  )
}
