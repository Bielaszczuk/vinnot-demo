/**
 * Notification preference hooks.
 * Flow: page → hook → notificationsService → notificationsClient → http
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { notificationsService } from '@services/notifications.service'
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPreferences,
} from '@domain/notification/notificationPreferences'

export type NotificationPreferenceChange =
  | { type: 'channel'; category: NotificationCategory; channel: NotificationChannel; enabled: boolean }
  | { type: 'consent'; granted: boolean }

export function useNotificationPreferences(enabled = true) {
  return useQuery<NotificationPreferences>({
    queryKey: queryKeys.users.notificationPreferences(),
    queryFn: () => notificationsService.getPreferences(),
    enabled,
  })
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()
  return useMutation<NotificationPreferences, Error, NotificationPreferenceChange>({
    mutationFn: (change) => change.type === 'consent'
      ? notificationsService.setMarketingConsent(change.granted)
      : notificationsService.setChannel(change.category, change.channel, change.enabled),
    onSuccess: (preferences) => {
      queryClient.setQueryData(queryKeys.users.notificationPreferences(), preferences)
    },
  })
}

export function useUnsubscribe() {
  return useMutation<string, Error, string>({
    mutationFn: (token) => notificationsService.unsubscribe(token),
  })
}
