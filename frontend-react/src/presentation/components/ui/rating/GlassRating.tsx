/**
 * GlassRating — a wine rating shown as five watercolor glasses, each filled
 * by its fraction of the score (2.2 = two full glasses and 0.2 of the third).
 * Glass, wine and bottle follow the wine type, as in the AI profile scenes.
 */

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { WineType } from '@domain/wine/wine.types'
import { RATING_MAX, glassFills, roundRating } from '@domain/wine/wine.rating'
import { ratingLook } from './ratingLook'
import { RatingGlass } from './RatingGlass'
import { useWineRatingType } from './wineRatingTypeContext'
import './rating.css'

interface GlassRatingProps {
  value: number
  /** Overrides the surrounding `WineRatingTypeProvider`; unknown types draw as red. */
  wineType?: WineType | string | null
  /** Glass height in px. */
  size?: number
  /** Show the score with one decimal after the glasses. */
  showValue?: boolean
  className?: string
}

/** Bubbles read as noise in small glasses. */
const BUBBLE_MIN_SIZE = 28

export function GlassRating({ value, wineType, size = 22, showValue = false, className = '' }: GlassRatingProps) {
  const { t, i18n } = useTranslation()
  const look = ratingLook(useWineRatingType(wineType))
  const rounded = roundRating(value)
  const shown = new Intl.NumberFormat(i18n?.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rounded)
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`.trim()}>
      <span
        role="img"
        aria-label={t('common.rating.glassesSummary', { value: shown, max: RATING_MAX })}
        className="vinnot-glasses"
        style={{ '--vinnot-glass-gap': `${Math.max(2, Math.round(size * 0.12))}px` } as CSSProperties}
      >
        {glassFills(rounded).map((fill, index) => (
          <RatingGlass key={index} look={look} fill={fill} height={size} bubbles={size >= BUBBLE_MIN_SIZE} />
        ))}
      </span>
      {showValue && (
        <span aria-hidden="true" className="text-sm font-semibold tabular-nums text-ink">{shown}</span>
      )}
    </span>
  )
}
