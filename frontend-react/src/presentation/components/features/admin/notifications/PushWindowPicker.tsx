import { useTranslation } from 'react-i18next'
import { PUSH_METRICS_WINDOWS, type PushMetricsWindow } from '@domain/admin/pushAdministration'

/** The 1, 7 or 30 days a push panel reads. */
export function PushWindowPicker({ days, onChange }: {
  days: PushMetricsWindow
  onChange: (days: PushMetricsWindow) => void
}) {
  const { t } = useTranslation()
  return (
    <div role="group" aria-label={t('admin.notifications.metrics.window')} className="inline-flex rounded-lg bg-gray-100 p-1">
      {PUSH_METRICS_WINDOWS.map((window) => (
        <button
          key={window}
          type="button"
          aria-pressed={days === window}
          onClick={() => onChange(window)}
          className={`min-h-9 rounded-md px-3 text-xs font-medium transition-colors ${days === window ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
        >
          {t('admin.notifications.metrics.days', { count: window })}
        </button>
      ))}
    </div>
  )
}
