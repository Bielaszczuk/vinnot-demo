/**
 * Admin notifications (#310): push switches, metrics and engagement results (#405), announcement preview, reach, test, send,
 * history and the results of one send (#490).
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminNotificationsService } from '@services/adminNotifications.service'
import type {
  AnnouncementAudience,
  AnnouncementDraft,
  AnnouncementKind,
  AnnouncementLanguage,
  AnnouncementVersion,
} from '@domain/admin/announcement'

const HISTORY_POLL_MS = 10_000
export function usePushSettings() {
  return useQuery({
    queryKey: queryKeys.admin.notifications.push(),
    queryFn: () => adminNotificationsService.getPushSettings(),
  })
}

export function usePushMetrics(days: number) {
  return useQuery({
    queryKey: queryKeys.admin.notifications.metrics(days),
    queryFn: () => adminNotificationsService.getPushMetrics(days),
    placeholderData: keepPreviousData,
  })
}

/** Engagement pushes per type (#405): sent, opened, opt-outs and whether the type is paused. */
export function usePushEngagement(days: number) {
  return useQuery({
    queryKey: queryKeys.admin.notifications.engagement(days),
    queryFn: () => adminNotificationsService.getPushEngagement(days),
    placeholderData: keepPreviousData,
  })
}

export function useSetPushTypeEnabled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, enabled }: { type: string; enabled: boolean }) =>
      adminNotificationsService.setPushTypeEnabled(type, enabled),
    onSuccess: (settings) => qc.setQueryData(queryKeys.admin.notifications.push(), settings),
  })
}

/** The rendered email and push of one language; pass `null` while the version cannot be rendered yet. */
export function useAnnouncementPreview(kind: AnnouncementKind, language: AnnouncementLanguage,
  version: AnnouncementVersion | null) {
  return useQuery({
    queryKey: queryKeys.admin.notifications.preview({ kind, language, title: version?.title, body: version?.body }),
    queryFn: () => adminNotificationsService.previewAnnouncement(kind, language, version!),
    enabled: version !== null,
    placeholderData: keepPreviousData,
    retry: false,
  })
}

export function useAnnouncementReach(kind: AnnouncementKind, audience: AnnouncementAudience) {
  return useQuery({
    queryKey: queryKeys.admin.notifications.reach({ kind, ...audience }),
    queryFn: () => adminNotificationsService.getAnnouncementReach(kind, audience),
    enabled: audience.email || audience.push,
    placeholderData: keepPreviousData,
  })
}

export function useAnnouncementHistory() {
  return useQuery({
    queryKey: queryKeys.admin.notifications.history(),
    queryFn: () => adminNotificationsService.getAnnouncementHistory(),
    // Poll while a send is still being delivered so its status changes without a reload.
    refetchInterval: (query) =>
      query.state.data?.some((record) => record.completedAt === null) ? HISTORY_POLL_MS : false,
  })
}

/**
 * One send or test with its latest results (#490), read only once one is chosen. `null` data means it no longer
 * exists. The key lives under the notifications key, so anything that refreshes notifications refreshes it too.
 */
export function useAnnouncementDetail(id: string | null) {
  return useQuery({
    queryKey: [...queryKeys.admin.notifications.all(), 'announcement', id] as const,
    queryFn: () => adminNotificationsService.getAnnouncement(id!),
    enabled: id !== null,
    refetchInterval: (query) => (query.state.data?.completedAt === null ? HISTORY_POLL_MS : false),
  })
}

export function useTestAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (draft: AnnouncementDraft) => adminNotificationsService.testAnnouncement(draft),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.notifications.history() }),
  })
}

export function useSendAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ draft, requestId }: { draft: AnnouncementDraft; requestId: string }) =>
      adminNotificationsService.sendAnnouncement(draft, requestId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.notifications.history() }),
  })
}
