import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUnsubscribe } from '@hooks/queries/notification/useNotificationPreferences'
import { isNotificationCategory } from '@domain/notification/notificationPreferences'
import { isRejectedUnsubscribeLink } from '@services/notifications.service'

type UnsubscribeStatus = 'idle' | 'loading' | 'success' | 'error' | 'failed'

/**
 * Unsubscribing waits for an explicit click: mail scanners open links with GET,
 * so loading the page must never change a preference.
 */
export function useUnsubscribeViewModel() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() ?? ''
  const unsubscribe = useUnsubscribe()

  const status: UnsubscribeStatus = !token || (unsubscribe.isError && isRejectedUnsubscribeLink(unsubscribe.error)) ? 'error'
    : unsubscribe.isError ? 'failed'
      : unsubscribe.isPending ? 'loading'
        : unsubscribe.isSuccess ? 'success' : 'idle'

  const category = unsubscribe.data && isNotificationCategory(unsubscribe.data)
    ? t(`notificationPreferences.categories.${unsubscribe.data}.name`) : null

  const message = status === 'error' ? t('unsubscribe.invalid')
    : status === 'failed' ? t('unsubscribe.failed')
    : status === 'success' ? t('unsubscribe.success', { category: category ?? t('unsubscribe.thisList') })
      : null

  const confirm = useCallback(() => {
    if (token) unsubscribe.mutate(token)
  }, [token, unsubscribe])

  return { t, status, message, canConfirm: status === 'idle' || status === 'failed', confirm }
}
