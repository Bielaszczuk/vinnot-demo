/**
 * The wine days of the current and next month (#489), so the administrator sees what the planner will anchor on.
 */
import { useTranslation } from 'react-i18next'
import { localizedName, type WineDay } from '@domain/admin/socialPost'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
import { Spinner } from '@components/ui/Spinner'

interface WineDayListProps {
  days: WineDay[]
  loading: boolean
  failed: boolean
  formatDay: (isoDate: string) => string
  onRetry: () => unknown
}

const PRIORITY_STYLES: Record<number, string> = {
  1: 'bg-wine-700 text-white',
  2: 'bg-wine-100 text-wine-800',
}

export function WineDayList({ days, loading, failed, formatDay, onRetry }: WineDayListProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  if (failed) return <AdminQueryError retry={onRetry} />
  if (loading) return <div className="p-8 text-center"><Spinner /></div>
  if (days.length === 0) return <p className="p-4 text-sm text-gray-500">{t('admin.socialPosts.wineDays.empty')}</p>
  return (
    <ul className="divide-y divide-gray-100" aria-label={t('admin.socialPosts.wineDays.heading')}>
      {days.map((day) => (
        <li key={day.code} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <span className="w-20 shrink-0 text-xs text-gray-500">{formatDay(day.date)}</span>
          <span className="min-w-0 flex-1 truncate text-gray-900">{localizedName(day, language)}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-2xs font-medium ${PRIORITY_STYLES[day.priority] ?? 'bg-gray-100 text-gray-600'}`}
            aria-label={t('admin.socialPosts.wineDays.priority', { priority: day.priority })}
          >
            P{day.priority}
          </span>
        </li>
      ))}
    </ul>
  )
}
