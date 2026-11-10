/**
 * RatingStars — the one star rating for display and input.
 *
 * Display (no `onChange`): one image with a translated summary.
 * Input (`onChange`): a radio group; click a star, or use the arrow keys,
 * Home and End. Filled stars use the `rating` token.
 */

import { useRef, type KeyboardEvent } from 'react'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ICON_STROKE } from './iconScale'

type RatingSize = 'sm' | 'md' | 'lg'

interface RatingStarsProps {
  value: number
  onChange?: (value: number) => void
  /** Accessible name of the input; defaults to "Puntuación" / "Rating". */
  label?: string
  max?: number
  size?: RatingSize
  disabled?: boolean
  className?: string
}

const starSize: Record<RatingSize, string> = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' }
const hitSize: Record<RatingSize, string> = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-11 w-11' }

function StarGlyph({ filled, size }: { filled: boolean; size: RatingSize }) {
  return (
    <Star
      aria-hidden="true"
      strokeWidth={ICON_STROKE}
      className={`${starSize[size]} ${filled ? 'text-rating' : 'text-gray-300'}`}
      fill={filled ? 'currentColor' : 'none'}
    />
  )
}

export function RatingStars({
  value,
  onChange,
  label,
  max = 5,
  size = 'md',
  disabled = false,
  className = '',
}: RatingStarsProps) {
  const { t, i18n } = useTranslation()
  const group = useRef<HTMLDivElement>(null)
  const filledCount = Math.round(value)
  const stars = Array.from({ length: max }, (_, index) => index + 1)

  if (!onChange) {
    const shown = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(value)
    return (
      <span
        role="img"
        aria-label={t('common.rating.summary', { value: shown, max })}
        className={`inline-flex items-center gap-0.5 ${className}`.trim()}
      >
        {stars.map((star) => (
          <StarGlyph key={star} filled={star <= filledCount} size={size} />
        ))}
      </span>
    )
  }

  const choose = (next: number) => {
    if (disabled) return
    const clamped = Math.min(Math.max(next, 1), max)
    onChange(clamped)
    group.current?.querySelector<HTMLButtonElement>(`[data-star="${clamped}"]`)?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = Math.max(filledCount, 1)
    const moves: Record<string, number> = {
      ArrowRight: filledCount + 1,
      ArrowUp: filledCount + 1,
      ArrowLeft: current - 1,
      ArrowDown: current - 1,
      Home: 1,
      End: max,
    }
    const next = moves[event.key]
    if (next === undefined) return
    event.preventDefault()
    choose(next)
  }

  const focusable = Math.min(Math.max(filledCount, 1), max)

  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label={label ?? t('common.rating.label')}
      aria-disabled={disabled || undefined}
      className={`inline-flex items-center ${className}`.trim()}
    >
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          data-star={star}
          aria-checked={star === filledCount}
          aria-label={t('common.rating.star', { count: star })}
          tabIndex={star === focusable ? 0 : -1}
          disabled={disabled}
          onClick={() => choose(star)}
          onKeyDown={onKeyDown}
          className={`${hitSize[size]} inline-flex items-center justify-center rounded-lg transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 motion-reduce:transition-none`}
        >
          <StarGlyph filled={star <= filledCount} size={size} />
        </button>
      ))}
    </div>
  )
}
