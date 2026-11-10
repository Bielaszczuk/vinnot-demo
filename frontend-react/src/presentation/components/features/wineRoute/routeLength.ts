import type { TFunction } from 'i18next'
import { formatDuration } from '@utils/format'

/** Route length in minutes when known, otherwise in days; a dash when the route gives neither. */
export function routeLengthLabel(t: TFunction, minutes: number, days: number | null | undefined): string {
  if (minutes > 0) return formatDuration(minutes)
  if (days && days > 0) return t('routes.days', { count: days })
  return '—'
}
