import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferenceChange,
} from '@hooks/queries/notification/useNotificationPreferences'
import {
  canChange,
  isChannelAvailable,
  isMarketingConsentChange,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPreference,
} from '@domain/notification/notificationPreferences'

export interface NotificationPreferenceRow extends NotificationPreference {
  changeable: boolean
}

export function useNotificationPreferencesViewModel() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const query = useNotificationPreferences()
  const update = useUpdateNotificationPreferences()
  const consentGranted = query.data?.marketingConsent.granted ?? false

  const apply = useCallback((change: NotificationPreferenceChange) => {
    update.mutate(change, {
      onSuccess: () => addToast({ type: 'success', message: t('notificationPreferences.saved') }),
      onError: () => addToast({ type: 'error', message: t('notificationPreferences.saveError') }),
    })
  }, [update, addToast, t])

  const setChannel = useCallback((category: NotificationCategory, channel: NotificationChannel, enabled: boolean) => {
    const row = query.data?.categories.find((item) => item.category === category)
    if (!row || !canChange(row, consentGranted) || !isChannelAvailable(row, channel)) return
    apply({ type: 'channel', category, channel, enabled })
  }, [query.data, consentGranted, apply])

  const setMarketingConsent = useCallback((granted: boolean) => {
    if (!isMarketingConsentChange(consentGranted, granted)) return
    apply({ type: 'consent', granted })
  }, [consentGranted, apply])

  const rows: NotificationPreferenceRow[] = (query.data?.categories ?? []).map((item) => ({
    ...item, changeable: canChange(item, consentGranted),
  }))

  return {
    t,
    isLoading: query.isLoading,
    error: query.error,
    retry: () => { void query.refetch() },
    isSaving: update.isPending,
    consentGranted,
    consentDecidedAt: query.data?.marketingConsent.decidedAt ?? null,
    rows,
    setChannel,
    setMarketingConsent,
  }
}
