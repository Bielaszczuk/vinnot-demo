import { Fragment } from 'react'
import { Card } from '@components/ui/Card'
import { QueryErrorState } from '@components/ui/QueryErrorState'
import { PageLoader } from '@components/ui/PageLoader'
import { isChannelAvailable, type NotificationChannel } from '@domain/notification/notificationPreferences'
import { EventAreaPicker } from './EventAreaPicker'
import {
  useNotificationPreferencesViewModel,
  type NotificationPreferenceRow,
} from './useNotificationPreferencesViewModel'

const CHANNELS: NotificationChannel[] = ['email', 'push']

export function UserProfileNotificationsTab() {
  const vm = useNotificationPreferencesViewModel()
  const { t } = vm

  if (vm.isLoading) return <PageLoader compact />
  if (vm.error) return <QueryErrorState error={vm.error} onRetry={vm.retry} />

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <label className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-lg font-semibold text-gray-900">{t('notificationPreferences.consentTitle')}</span>
            <span className="mt-1 block text-sm text-gray-500">{t('notificationPreferences.consentHint')}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="mt-1 h-5 w-5 shrink-0 accent-wine-700"
            checked={vm.consentGranted}
            disabled={vm.isSaving}
            onChange={(event) => vm.setMarketingConsent(event.target.checked)}
          />
        </label>
      </Card>

      <Card padding="lg">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">{t('notificationPreferences.title')}</h2>
        <p className="mb-6 text-sm text-gray-500">{t('notificationPreferences.description')}</p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2 font-medium">{t('notificationPreferences.category')}</th>
              {CHANNELS.map((channel) => (
                <th key={channel} className="w-20 py-2 text-center font-medium">{t(`notificationPreferences.channels.${channel}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vm.rows.map((row) => (
              <Fragment key={row.category}>
                <PreferenceRow row={row} vm={vm} />
                {row.category === 'EVENTS_NEARBY' && (
                  <tr className="border-b border-border/60 last:border-0">
                    <td colSpan={CHANNELS.length + 1} className="pb-3">
                      <EventAreaPicker />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function PreferenceRow({ row, vm }: { row: NotificationPreferenceRow; vm: ReturnType<typeof useNotificationPreferencesViewModel> }) {
  const { t } = vm
  const name = t(`notificationPreferences.categories.${row.category}.name`)
  const hint = row.kind === 'TRANSACTIONAL'
    ? t('notificationPreferences.alwaysOn')
    : !row.changeable ? t('notificationPreferences.needsConsent')
      : t(`notificationPreferences.categories.${row.category}.description`)
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-3 pr-4">
        <span className="block font-medium text-gray-900">{name}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </td>
      {CHANNELS.map((channel) => (
        <td key={channel} className="py-3 text-center">
          {!isChannelAvailable(row, channel) ? <span className="text-gray-300" aria-hidden="true">—</span> : <input
            type="checkbox"
            className="h-4 w-4 accent-wine-700"
            aria-label={`${name}: ${t(`notificationPreferences.channels.${channel}`)}`}
            checked={row[channel]}
            disabled={!row.changeable || vm.isSaving}
            onChange={(event) => vm.setChannel(row.category, channel, event.target.checked)}
          />}
        </td>
      ))}
    </tr>
  )
}
