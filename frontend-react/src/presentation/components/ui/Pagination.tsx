/**
 * Pagination — previous, a window of page numbers and next.
 *
 * Pages are zero-based, like the API. With a single page nothing renders.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from './Icon'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Extra context after the page status, for example "120 wines". */
  summary?: string
  /** Name of the navigation when a page has more than one list; defaults to "Paginación". */
  label?: string
  disabled?: boolean
  className?: string
}

const WINDOW = 2

const pageButton =
  'inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-xl px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40'
const idle = 'border border-gray-200 bg-white text-gray-700 shadow-sm hover:border-wine-200 hover:bg-wine-50 hover:text-wine-800'
const current = 'bg-wine-700 text-white shadow-sm'

export function Pagination({ page, totalPages, onPageChange, summary, label, disabled = false, className = '' }: PaginationProps) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, index) => index).filter(
    (candidate) => candidate >= page - WINDOW && candidate <= page + WINDOW,
  )
  const status = t('common.pagination.status', { current: page + 1, total: totalPages })

  return (
    <nav aria-label={label ?? t('common.pagination.label')} className={`flex flex-col items-center gap-3 pt-4 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button type="button" className={`${pageButton} ${idle}`} disabled={disabled || page <= 0} onClick={() => onPageChange(page - 1)}>
          <Icon icon={ChevronLeft} />
          {t('common.previous')}
        </button>
        {pages.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-label={t('common.pagination.page', { page: candidate + 1 })}
            aria-current={candidate === page ? 'page' : undefined}
            disabled={disabled}
            className={`${pageButton} ${candidate === page ? current : idle}`}
            onClick={() => onPageChange(candidate)}
          >
            {candidate + 1}
          </button>
        ))}
        <button
          type="button"
          className={`${pageButton} ${idle}`}
          disabled={disabled || page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          {t('common.next')}
          <Icon icon={ChevronRight} />
        </button>
      </div>
      <p className="text-xs text-gray-500">{summary ? `${status} · ${summary}` : status}</p>
    </nav>
  )
}
