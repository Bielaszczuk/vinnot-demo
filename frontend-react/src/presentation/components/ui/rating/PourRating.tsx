/**
 * PourRating — the rating input. Opened unrated, the bottle stands corked beside
 * five glasses and uncorks itself as the AI profile scene does, before any score
 * (a touch meanwhile finishes it at once); the first change lifts it over them
 * and pours in step with the bar. Then it follows the pointer: while the score rises it tilts
 * and pours a stream of the wine colour into the glass being filled, and the
 * bottle empties; while it falls it lifts, the glasses empty and the bottle fills
 * again. At 5.0 it is back on its stand, open and empty. A click on a
 * glass also sets the score. Under the glasses a slider bar (PourSlider) offers
 * the same score: its small glass slides and fills with the score, and dragging
 * it moves the bottle as dragging the bottle does. The score readout sits at the
 * right end of the bar. The control is an accessible
 * slider from 0.1 to 5.0 in steps of 0.1 (arrows ±0.1, Page Up/Down ±0.5,
 * Home/End); the bar is hidden from assistive tech. A value of 0 means "not
 * rated yet": until the control is touched a light hint says to drag the bottle
 * or the bar. While this browser has rated fewer than three times, a see-through
 * bottle also shows the gesture twice once the bottle is open, each time the
 * control opens unrated, or until it is touched, with a see-through glass
 * gliding along the bar.
 */

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { WineType } from '@domain/wine/wine.types'
import { RATING_MAX, RATING_MIN, clampRating, glassFills, stepRating } from '@domain/wine/wine.rating'
import { ratingLook } from './ratingLook'
import {
  BAR_TRACK,
  GHOST_CYCLE_MS,
  POUR_GLASS_HEIGHT,
  UNCORK_MS,
  barLayout,
  bottlePose,
  bottleStage,
  glassLeft,
  pourLayout,
  ratingAtX,
  standPose,
  type PourSize,
} from './pourGeometry'
import { PourBottle } from './PourBottle'
import { PourGhost } from './PourGhost'
import { PourSlider } from './PourSlider'
import { RatingGlass } from './RatingGlass'
import { useWineRatingType } from './wineRatingTypeContext'
import { useReducedMotion } from '@/presentation/hooks/useReducedMotion'
import { useRatingGestureCoach } from '@/presentation/hooks/useRatingGestureCoach'
import './rating.css'

interface PourRatingProps {
  value: number
  onChange: (value: number) => void
  /** Overrides the surrounding `WineRatingTypeProvider`; unknown types draw as red. */
  wineType?: WineType | string | null
  /** Accessible name; defaults to "Rating". */
  label?: string
  disabled?: boolean
  /** Hides the score readout next to the glasses. */
  hideScore?: boolean
  /** `lg` for the review form, `md` (default) for dialogs; close to the star row it replaced. */
  size?: PourSize
  className?: string
}

const KEY_STEPS: Record<string, number> = {
  ArrowRight: 0.1,
  ArrowUp: 0.1,
  ArrowLeft: -0.1,
  ArrowDown: -0.1,
  PageUp: 0.5,
  PageDown: -0.5,
}
/** The drag demo plays this many times each time the control opens unrated. */
const GHOST_LOOPS = 2
/** How long the bottle keeps pouring after the last rise. */
const POUR_HOLD_MS = 260
const FRAME_MS = 16
/** Bottle carried between its stand and the glasses (see rating.css). */
const TRAVEL_MS = 420

type Travel = 'lift' | 'settle'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

export function PourRating({
  value,
  onChange,
  wineType,
  label,
  disabled = false,
  hideScore = false,
  size = 'md',
  className = '',
}: PourRatingProps) {
  const { t, i18n } = useTranslation()
  const look = ratingLook(useWineRatingType(wineType))
  const control = useRef<HTMLDivElement>(null)
  const layout = pourLayout(POUR_GLASS_HEIGHT[size], look)
  const bar = barLayout(layout, look)
  const hintId = useId()
  const reducedMotion = useReducedMotion()
  const coach = useRatingGestureCoach()
  /** Each opening counts once towards learning the gesture. */
  const counted = useRef(false)
  // The drag demo ends at the first touch or after its loops, for this mount.
  const [touched, setTouched] = useState(false)
  const [played, setPlayed] = useState(false)
  const [pouring, setPouring] = useState(false)
  const stopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dragging = useRef(false)
  // The latest score, so a fast drag compares against its own last step.
  const current = useRef(value)
  useLayoutEffect(() => {
    current.current = value
  }, [value])

  useEffect(() => () => clearTimeout(stopTimer.current), [])

  // The bottle rests beside the glasses while corked and once 5.0 is poured.
  const stage = bottleStage(value)
  const resting = stage === 'corked' || (stage === 'finished' && !pouring)
  const [seen, setSeen] = useState({ stage, resting })
  const [travel, setTravel] = useState<Travel | null>(null)
  // Opened unrated, the bottle uncorks itself on its stand before any score (at once with reduced motion).
  const [autoOpen] = useState(() => stage === 'corked' && !disabled)
  // 0 corked, 1 open: the progress of the uncorking, which runs while the bottle waits on its stand.
  const [uncork, setUncork] = useState(() => (stage !== 'corked' || (autoOpen && prefersReducedMotion()) ? 1 : 0))
  const [opening, setOpening] = useState(() => autoOpen && !prefersReducedMotion())
  // Coming off the stand corked, the wine waits until the bottle is open and over the glasses.
  const [held, setHeld] = useState(false)
  if (seen.stage !== stage || seen.resting !== resting) {
    const still = prefersReducedMotion()
    const leavingCork = seen.stage === 'corked' && stage !== 'corked'
    if (stage === 'corked') {
      // Corked again (the form resets): the cork goes back once the bottle is on its stand.
      setOpening(false)
      setHeld(false)
      if (still || seen.resting) setUncork(0)
    } else if (leavingCork && uncork < 1) {
      // Still corked (it was not opened on mount): uncork first, the wine waits.
      if (still) setUncork(1)
      else {
        setOpening(true)
        setHeld(true)
      }
    }
    const waitsForCork = leavingCork && uncork < 1
    if (seen.resting !== resting && !still && !waitsForCork) setTravel(resting ? 'settle' : 'lift')
    setSeen({ stage, resting })
  }
  useEffect(() => {
    if (!opening) return
    const start = Date.now()
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const progress = Math.min(1, (Date.now() - start) / UNCORK_MS)
      setUncork(progress)
      if (progress < 1) timer = setTimeout(tick, FRAME_MS)
      else {
        setOpening(false)
        // Opened before any score, it stays on its stand until the first one.
        if (current.current > 0) setTravel('lift')
      }
    }
    timer = setTimeout(tick, FRAME_MS)
    return () => clearTimeout(timer)
  }, [opening])
  useEffect(() => {
    if (!travel) return
    const timer = setTimeout(() => {
      setTravel(null)
      if (travel === 'settle' && current.current <= 0) setUncork(0)
      if (travel === 'lift' && held) {
        // Over the glasses at last: pour what the score asked for.
        setHeld(false)
        if (bottleStage(current.current) === 'pouring') {
          setPouring(true)
          clearTimeout(stopTimer.current)
          stopTimer.current = setTimeout(() => setPouring(false), POUR_HOLD_MS)
        }
      }
    }, TRAVEL_MS)
    return () => clearTimeout(timer)
  }, [travel, held])

  const setRating = (raw: number) => {
    if (disabled) return
    const next = clampRating(raw)
    const previous = current.current
    if (next === previous) return
    current.current = next
    setPouring(next > previous)
    clearTimeout(stopTimer.current)
    stopTimer.current = setTimeout(() => setPouring(false), POUR_HOLD_MS)
    onChange(next)
    if (!counted.current) {
      counted.current = true
      coach.recordRating()
    }
  }

  const fromPointer = (event: PointerEvent<HTMLElement>) => {
    const rect = control.current!.getBoundingClientRect()
    return ratingAtX(event.clientX - rect.left, layout)
  }

  /** A touch ends the guidance and finishes an uncorking still under way, so the first score pours at once. */
  const touch = () => {
    setTouched(true)
    if (opening && !held) {
      setOpening(false)
      setUncork(1)
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    touch()
    dragging.current = true
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setRating(fromPointer(event))
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setRating(fromPointer(event))
  }
  const endDrag = () => {
    dragging.current = false
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!disabled) touch()
    const step = KEY_STEPS[event.key]
    let next: number | undefined
    if (step !== undefined) next = stepRating(current.current, step)
    else if (event.key === 'Home') next = RATING_MIN
    else if (event.key === 'End') next = RATING_MAX
    if (next === undefined) return
    event.preventDefault()
    setRating(next)
  }

  const format = (n: number) =>
    new Intl.NumberFormat(i18n?.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)
  const rated = value > 0
  const shown = format(value)
  const pose = bottlePose(rated ? value : 0, layout, look, pouring)
  const atStand = resting || opening
  const place = atStand ? standPose(layout) : pose
  const streaming = pouring && !atStand && travel !== 'lift' && !held
  const poured = held ? 0 : value
  const fills = glassFills(poured)
  const guiding = !rated && !disabled && !touched
  // The demo waits for the bottle to be open.
  const demo = guiding && !played && !coach.learned && !reducedMotion && uncork >= 1
  useEffect(() => {
    if (!demo) return
    const timer = setTimeout(() => setPlayed(true), GHOST_LOOPS * GHOST_CYCLE_MS)
    return () => clearTimeout(timer)
  }, [demo])

  return (
    <div className={`vinnot-pour-card ${className}`.trim()}>
      <div
        ref={control}
        className="vinnot-pour"
        style={{ width: layout.width, height: layout.height }}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label ?? t('common.rating.label')}
        aria-valuemin={RATING_MIN}
        aria-valuemax={RATING_MAX}
        aria-valuenow={rated ? value : undefined}
        aria-valuetext={rated ? t('common.rating.valueText', { value: format(value), max: RATING_MAX }) : t('common.rating.noValue')}
        aria-disabled={disabled || undefined}
        aria-describedby={hintId}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        {fills.map((fill, index) => (
          <RatingGlass
            key={index}
            look={look}
            fill={fill}
            height={layout.glassHeight}
            surface
            bubbles
            style={{ left: glassLeft(layout, index), top: layout.top }}
          />
        ))}
        <svg className="vp-stream" aria-hidden="true" data-pouring={streaming || undefined}>
          {/* A new key per glass replays the fade-in, so no wine shows while the bottle moves over. */}
          <g key={pose.glass} className="vp-pour-in">
            <path d={pose.stream} stroke={look.pour} strokeWidth={3.2} style={{ opacity: streaming ? 1 : 0 }} />
            <path className="vp-flow" d={pose.stream} stroke="rgba(255,255,255,.55)" strokeWidth={1.4} style={{ opacity: streaming ? 1 : 0 }} />
          </g>
        </svg>
        <PourBottle
          layout={layout}
          look={look}
          place={place}
          standing={atStand}
          corked={uncork < 1}
          travel={travel ?? undefined}
          uncork={uncork}
          remaining={1 - poured / RATING_MAX}
        />
        {demo && <PourGhost layout={layout} look={look} />}
      </div>
      {/* The score reads at the right end of the bar, centred on its track. */}
      <div className="vinnot-pour-bar-row" style={{ '--vp-bar-track-mid': `${bar.trackTop + BAR_TRACK / 2}px` } as CSSProperties}>
        <PourSlider
          look={look}
          value={value}
          layout={layout}
          disabled={disabled}
          demo={demo}
          onTouch={touch}
          onRate={setRating}
        />
        {!hideScore && (
          <div className="vinnot-pour-score" aria-hidden="true" data-testid="pour-score">
            <b>{shown}</b>
            <span>/ {RATING_MAX}</span>
          </div>
        )}
      </div>
      {guiding && <p className="vinnot-pour-hint text-xs text-gray-500">{t('common.rating.dragHint')}</p>}
      <span id={hintId} className="sr-only">{t('common.rating.pourHint')}</span>
    </div>
  )
}
