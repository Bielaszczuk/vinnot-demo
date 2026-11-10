import { useTranslation } from 'react-i18next'
import { Spinner } from '@components/ui/Spinner'
import type { PushSettings, PushTypeSetting } from '@domain/admin/pushAdministration'

/** One switch per push type; the change applies to the next delivery, with no deploy. */
export function PushTypeSwitches({ settings, sending, switching, typeLabel, onToggle }: {
  settings: PushSettings
  sending: boolean
  switching: string | null
  typeLabel: (type: string) => string
  onToggle: (setting: PushTypeSetting) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  return (
    <div className="space-y-5">
      <div className={`rounded-xl p-4 text-sm ${sending ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`} role="status">
        <p className="font-semibold">{t('admin.notifications.push.provider', { provider: settings.provider })}</p>
        <p className="mt-1 text-xs">{t(sending ? 'admin.notifications.push.providerOn' : 'admin.notifications.push.providerOff')}</p>
      </div>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200/60">
        {settings.types.map((setting) => {
          const label = typeLabel(setting.type)
          return (
            <li key={setting.type} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">
                  {t(setting.transactional ? 'admin.notifications.push.transactional' : 'admin.notifications.push.optional')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {switching === setting.type && <Spinner size="sm" />}
                <button
                  type="button"
                  role="switch"
                  aria-checked={setting.enabled}
                  aria-label={label}
                  disabled={switching !== null}
                  onClick={() => onToggle(setting)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-wine-500/40 disabled:opacity-60 ${setting.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${setting.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {settings.recentChanges.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('admin.notifications.push.recentChanges')}</h3>
          <ul className="space-y-1.5 text-xs text-gray-600">
            {settings.recentChanges.map((change) => (
              <li key={`${change.type}-${change.changedAt}`}>
                {t(change.enabled ? 'admin.notifications.push.changeOn' : 'admin.notifications.push.changeOff', {
                  type: typeLabel(change.type),
                  by: change.changedBy,
                  date: new Date(change.changedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }),
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
