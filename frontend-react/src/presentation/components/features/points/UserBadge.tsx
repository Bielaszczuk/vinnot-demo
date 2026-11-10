/**
 * UserBadge — a user's wax-seal emblem with the approved motion.
 *
 * `list` (default): plays a short burst when it appears and again every
 * 8–16 s while visible; sparkles are skipped below 40 px.
 * `loop`: plays forever (profile, celebration, points page).
 * Reduced motion: a still seal with a fixed highlight.
 * Renders nothing when the tier is unknown or hidden (`null`).
 */

import { useMemo, useRef, type CSSProperties, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { BadgeTier } from '@domain/points/points.types'
import { tierSlug } from '@domain/points/points.tiers'
import { useReducedMotion } from '@hooks/useReducedMotion'
import { sealImage, sealSparkles, TILT_MIN_SIZE } from './sealMotion'
import { useSealReplay } from './useSealReplay'
import './userBadge.css'

export type SealMode = 'list' | 'loop'

interface UserBadgeProps {
  tier: BadgeTier | null | undefined
  /** Size in px. */
  size?: number
  mode?: SealMode
  /** Hide from assistive technology when a nearby text already names the tier. */
  decorative?: boolean
  className?: string
}

const TILT_PROPS = ['--rx', '--ry', '--mx', '--my', '--ang']

export function UserBadge({ tier, size = 20, mode = 'list', decorative = false, className = '' }: UserBadgeProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  useSealReplay(ref, Boolean(tier) && mode === 'list' && !reduced)
  const sparkles = useMemo(() => (tier ? sealSparkles(tier, size) : []), [tier, size])
  if (!tier) return null

  const tilt = !reduced && size >= TILT_MIN_SIZE ? (size >= 160 ? 18 : 12) : 0
  const onPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    element.style.setProperty('--rx', `${((0.5 - y) * tilt).toFixed(1)}deg`)
    element.style.setProperty('--ry', `${((x - 0.5) * tilt).toFixed(1)}deg`)
    element.style.setProperty('--mx', `${(x * 100).toFixed(0)}%`)
    element.style.setProperty('--my', `${(y * 100).toFixed(0)}%`)
    element.style.setProperty('--ang', `${(90 + (x - 0.5) * 80).toFixed(0)}deg`)
  }
  const onPointerLeave = (event: PointerEvent<HTMLSpanElement>) => {
    for (const property of TILT_PROPS) event.currentTarget.style.removeProperty(property)
  }

  const classes = [
    'vinnot-seal',
    `vinnot-seal--${tierSlug(tier)}`,
    mode === 'list' ? 'is-list' : '',
    reduced ? 'is-still' : '',
    className,
  ].filter(Boolean).join(' ')
  const name = t(`points.tiers.${tier}`)
  const style = { '--s': `${size}px`, '--img': `url(${sealImage(tier)})` } as CSSProperties

  return (
    <span
      ref={ref}
      className={classes}
      style={style}
      data-tier={tier}
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': t('points.emblemLabel', { tier: name }) })}
      onPointerMove={tilt ? onPointerMove : undefined}
      onPointerLeave={tilt ? onPointerLeave : undefined}
    >
      <span className="vs-tilt">
        <span className="vs-behind vs-rays" />
        <span className="vs-behind vs-halo" />
        <span className="vs-body">
          <span className="vs-art" />
          <span className="vs-m vs-tint" />
          <span className="vs-m vs-holo" />
          <span className="vs-m vs-glitter" />
          <span className="vs-m vs-sheen" />
        </span>
        {sparkles.length > 0 && (
          <span className="vs-fx">
            {sparkles.map((sparkle, index) => (
              <i key={index} className={sparkle.kind === 'spark' ? 'vs-spark' : 'vs-dot'} style={sparkle.style as CSSProperties} />
            ))}
          </span>
        )}
      </span>
    </span>
  )
}
