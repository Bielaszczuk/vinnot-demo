/**
 * Admin notifications query hooks (#310, mobile #327): push switches, metrics and engagement, announcement preview,
 * reach, test, send, history and one announcement's delivery counts (#490), through the shared RTK Query operations.
 */
import { useCallback } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { appApi, useTypedQuery } from "@/presentation/store/api";
import { useAppDispatch } from "@/presentation/store/hooks";
import { useOperationMutation } from "@/presentation/store/mutationAdapter";
import type {
  AnnouncementAudience,
  AnnouncementDraft,
  AnnouncementKind,
  AnnouncementLanguage,
  AnnouncementPreview,
  AnnouncementReach,
  AnnouncementRecord,
  AnnouncementVersion,
} from "@/domain/admin/announcement";
import type { PushMetrics, PushMetricsWindow, PushSettings } from "@/domain/admin/pushAdministration";
import type { PushEngagement } from "@/domain/admin/announcementStats";

/** How often the history refreshes while a send is still going out. */
export const ANNOUNCEMENT_HISTORY_POLL_MS = 10_000;

const PUSH_SETTINGS = { key: "admin.notifications.push" } as const;
const HISTORY = { key: "admin.notifications.history" } as const;

export function usePushSettings() {
  return useTypedQuery<PushSettings>(PUSH_SETTINGS);
}

export function usePushMetrics(days: PushMetricsWindow) {
  return useTypedQuery<PushMetrics>({ key: "admin.notifications.metrics", params: { days } });
}

export function usePushEngagement(days: PushMetricsWindow) {
  return useTypedQuery<PushEngagement>({ key: "admin.notifications.engagement", params: { days } });
}

/** The announcement opened in the history, read again on every opening so its counts are the latest. */
export function useAnnouncementDetail(id: string | null) {
  return useTypedQuery<AnnouncementRecord | null>(
    id ? { key: "admin.notifications.detail", params: { id } } : skipToken,
    { refetchOnMountOrArgChange: true },
  );
}

/** The switch answer replaces the cached settings at once, so the switch never flips back while refetching. */
export function useSetPushTypeEnabled() {
  const dispatch = useAppDispatch();
  const mutation = useOperationMutation<PushSettings, { type: string; enabled: boolean }>(({ type, enabled }) => ({
    key: "admin.notifications.push.toggle",
    params: { type, enabled },
  }));
  const { mutateAsync } = mutation;
  const toggle = useCallback(
    async (change: { type: string; enabled: boolean }) => {
      const settings = await mutateAsync(change);
      dispatch(appApi.util.updateQueryData("executeQuery", PUSH_SETTINGS, () => settings));
      return settings;
    },
    [dispatch, mutateAsync],
  );
  return { ...mutation, mutateAsync: toggle };
}

/** The rendered push and email of one language; pass `null` while the version cannot be rendered yet. */
export function useAnnouncementPreview(
  kind: AnnouncementKind,
  language: AnnouncementLanguage,
  version: AnnouncementVersion | null,
) {
  return useTypedQuery<AnnouncementPreview>(
    version
      ? { key: "admin.notifications.preview", params: { kind, language, title: version.title, body: version.body } }
      : skipToken,
  );
}

export function useAnnouncementReach(kind: AnnouncementKind, audience: AnnouncementAudience) {
  return useTypedQuery<AnnouncementReach>(
    audience.email || audience.push ? { key: "admin.notifications.reach", params: { kind, ...audience } } : skipToken,
  );
}

/** Polls while a send is still being delivered so its status changes without a reload. */
export function useAnnouncementHistory() {
  // The cached history decides the interval of the subscription that keeps it fresh.
  const cached = appApi.endpoints.executeQuery.useQueryState(HISTORY).data as AnnouncementRecord[] | undefined;
  const delivering = cached?.some((record) => record.completedAt === null) ?? false;
  return useTypedQuery<AnnouncementRecord[]>(HISTORY, {
    pollingInterval: delivering ? ANNOUNCEMENT_HISTORY_POLL_MS : 0,
  });
}

export function useTestAnnouncement() {
  return useOperationMutation<AnnouncementReach, AnnouncementDraft>((draft) => ({
    key: "admin.notifications.announcement.test",
    params: { draft },
  }));
}

export function useSendAnnouncement() {
  return useOperationMutation<AnnouncementRecord | null, { draft: AnnouncementDraft; requestId: string }>(
    ({ draft, requestId }) => ({ key: "admin.notifications.announcement.send", params: { draft, requestId } }),
  );
}
