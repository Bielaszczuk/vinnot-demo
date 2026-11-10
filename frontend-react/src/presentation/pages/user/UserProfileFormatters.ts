import { formatDate } from '@utils/date'
import { formatDecimal } from '@utils/format'

/** A profile date in the app language (or `locale`); "-" when missing or invalid. */
export function formatProfileDate(date: Date | string | undefined, locale?: string): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '-'
  return formatDate(d, { year: 'numeric', month: 'long', day: 'numeric' }, locale)
}

/** The average rating with one decimal in the app language; "-" without reviews. */
export function formatProfileRating(rating: number): string {
  return rating > 0 ? formatDecimal(rating, 1) : '-'
}
