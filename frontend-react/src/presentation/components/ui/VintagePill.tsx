/**
 * VintagePill — compact label for the vintage a user tasted ("Vintage 2018").
 */

import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface VintagePillProps {
  year: number
  className?: string
}

export function VintagePill({ year, className = '' }: VintagePillProps) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-wine-50 px-2.5 py-0.5 text-xs font-medium text-wine-700 ring-1 ring-inset ring-wine-100 ${className}`.trim()}
    >
      <CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" />
      {t('vintage.pill', { year })}
    </span>
  )
}
