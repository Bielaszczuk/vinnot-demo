import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { usePushEngagement, usePushMetrics, usePushSettings, useSetPushTypeEnabled } from '@hooks/queries/admin'
import {
  DEFAULT_PUSH_METRICS_WINDOW,
  sendsPushes,
  type PushMetricsWindow,
  type PushTypeSetting,
} from '@domain/admin/pushAdministration'

/** Push controls of the admin notifications section (#310): switches per type, metrics, engagement (#405) and the provider. */
export function usePushControlsViewModel() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [days, setDays] = useState<PushMetricsWindow>(DEFAULT_PUSH_METRICS_WINDOW)
  const [pendingOff, setPendingOff] = useState<PushTypeSetting | null>(null)
  const settings = usePushSettings()
  const metrics = usePushMetrics(days)
  const [engagementDays, setEngagementDays] = useState<PushMetricsWindow>(DEFAULT_PUSH_METRICS_WINDOW)
  const engagement = usePushEngagement(engagementDays)
  const switchMutation = useSetPushTypeEnabled()

  const typeLabel = useCallback((type: string) =>
    t(`admin.notifications.pushTypes.${type}`, { defaultValue: type }), [t])

  const change = useCallback(async (setting: PushTypeSetting, enabled: boolean) => {
    try {
      await switchMutation.mutateAsync({ type: setting.type, enabled })
      addToast({
        type: 'success',
        message: t(enabled ? 'admin.notifications.push.turnedOn' : 'admin.notifications.push.turnedOff', {
          type: typeLabel(setting.type),
        }),
      })
      setPendingOff(null)
    } catch {
      addToast({ type: 'error', message: t('admin.notifications.errors.generic') })
    }
  }, [addToast, switchMutation, t, typeLabel])

  /** Turning a transactional type off asks first: those pushes carry tickets, payments and changes to events. */
  const toggle = useCallback((setting: PushTypeSetting) => {
    if (setting.enabled && setting.transactional) {
      setPendingOff(setting)
      return
    }
    void change(setting, !setting.enabled)
  }, [change])

  return {
    t,
    settings,
    metrics,
    days,
    setDays,
    engagement,
    engagementDays,
    setEngagementDays,
    typeLabel,
    sending: settings.data ? sendsPushes(settings.data.provider) : true,
    switching: switchMutation.isPending ? switchMutation.variables?.type ?? null : null,
    toggle,
    pendingOff,
    cancelOff: () => setPendingOff(null),
    confirmOff: () => (pendingOff ? change(pendingOff, false) : Promise.resolve()),
  }
}
