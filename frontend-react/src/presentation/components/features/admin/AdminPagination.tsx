/**
 * AdminPagination — reusable pagination bar for admin list pages
 */
import { useTranslation } from 'react-i18next'
import { formatNumber } from '@utils/format'

interface AdminPaginationProps {
  page: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
  label?: string
}

export function AdminPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  label,
}: AdminPaginationProps) {
  const { t, i18n } = useTranslation()
  if (totalPages <= 1) return null

  return (
    <div className="px-5 py-4 border-t border-gray-100 flex justify-between items-center">
      <span className="text-xs text-gray-500">
        {t('admin.common.totalItems', { count: formatNumber(totalItems, undefined, i18n.resolvedLanguage ?? i18n.language), label: label ?? t('common.results') })}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            page === 0
              ? 'border-gray-200 text-gray-400'
              : 'border-gray-200 text-gray-600 hover:bg-wine-50 hover:text-wine-700 hover:border-wine-200'
          }`}
        >
          ← {t('common.previous')}
        </button>
        <span className="px-3 py-1.5 text-xs font-semibold text-wine-700 bg-wine-50 rounded-lg">
          {page + 1} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            page >= totalPages - 1
              ? 'border-gray-200 text-gray-400'
              : 'border-gray-200 text-gray-600 hover:bg-wine-50 hover:text-wine-700 hover:border-wine-200'
          }`}
        >
          {t('common.next')} →
        </button>
      </div>
    </div>
  )
}
