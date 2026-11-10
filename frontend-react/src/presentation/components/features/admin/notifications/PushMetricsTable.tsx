import { useTranslation } from 'react-i18next'
import { Spinner } from '@components/ui/Spinner'
import { PUSH_OUTCOMES, type PushMetrics, type PushMetricsWindow } from '@domain/admin/pushAdministration'
import { PushWindowPicker } from './PushWindowPicker'

/** Outcomes per push type for the chosen window. */
export function PushMetricsTable({ metrics, days, loading, typeLabel, onDaysChange }: {
  metrics: PushMetrics | undefined
  days: PushMetricsWindow
  loading: boolean
  typeLabel: (type: string) => string
  onDaysChange: (days: PushMetricsWindow) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PushWindowPicker days={days} onChange={onDaysChange} />
        {loading && <Spinner size="sm" />}
      </div>
      {!metrics ? (
        <div className="p-8 text-center"><Spinner /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-2xs font-semibold uppercase text-gray-500">
                <th className="px-4 py-3">{t('admin.notifications.metrics.type')}</th>
                {PUSH_OUTCOMES.map((outcome) => (
                  <th key={outcome} className="px-2 py-3 text-right">{t(`admin.notifications.metrics.outcomes.${outcome}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {metrics.types.map((row) => (
                <tr key={row.type}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{typeLabel(row.type)}</td>
                  {PUSH_OUTCOMES.map((outcome) => (
                    <td key={outcome} className={`px-2 py-2.5 text-right tabular-nums ${row.counts[outcome] > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                      {row.counts[outcome].toLocaleString(locale)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-500">{t('admin.notifications.metrics.help')}</p>
    </div>
  )
}
