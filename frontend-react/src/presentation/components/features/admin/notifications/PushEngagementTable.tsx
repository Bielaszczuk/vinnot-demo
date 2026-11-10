import { useTranslation } from 'react-i18next'
import { Spinner } from '@components/ui/Spinner'
import type { PushEngagement, PushMetricsWindow } from '@domain/admin/pushAdministration'
import { PushWindowPicker } from './PushWindowPicker'

/** Engagement pushes per type for the chosen window (#405): sent, opened, open rate, opt-outs and paused types. */
export function PushEngagementTable({ engagement, days, loading, typeLabel, onDaysChange }: {
  engagement: PushEngagement | undefined
  days: PushMetricsWindow
  loading: boolean
  typeLabel: (type: string) => string
  onDaysChange: (days: PushMetricsWindow) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const number = (value: number) => value.toLocaleString(locale)
  const percent = (value: number | null) =>
    value === null ? '—' : value.toLocaleString(locale, { style: 'percent', maximumFractionDigits: 1 })
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PushWindowPicker days={days} onChange={onDaysChange} />
        {loading && <Spinner size="sm" />}
      </div>
      {!engagement ? (
        <div className="p-8 text-center"><Spinner /></div>
      ) : engagement.types.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">{t('admin.notifications.engagement.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-2xs font-semibold uppercase text-gray-500">
                <th className="px-4 py-3">{t('admin.notifications.metrics.type')}</th>
                <th className="px-2 py-3 text-right">{t('admin.notifications.engagement.sent')}</th>
                <th className="px-2 py-3 text-right">{t('admin.notifications.engagement.opened')}</th>
                <th className="px-2 py-3 text-right">{t('admin.notifications.engagement.openRate')}</th>
                <th className="px-2 py-3 text-right">{t('admin.notifications.engagement.optedOut')}</th>
                <th className="px-4 py-3 text-right">{t('admin.notifications.engagement.state')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {engagement.types.map((row) => (
                <tr key={row.type}>
                  <th scope="row" className="px-4 py-2.5 text-left font-medium text-gray-900">{typeLabel(row.type)}</th>
                  <td className="px-2 py-2.5 text-right tabular-nums text-gray-900">{number(row.sent)}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-gray-900">{number(row.opened)}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-gray-900">{percent(row.openRate)}</td>
                  <td className={`px-2 py-2.5 text-right tabular-nums ${row.optedOut > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{number(row.optedOut)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-2xs font-semibold ${row.paused ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                      {t(row.paused ? 'admin.notifications.engagement.paused' : 'admin.notifications.engagement.active')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-500">{t('admin.notifications.engagement.help')}</p>
    </div>
  )
}
