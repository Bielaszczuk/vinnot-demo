import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAnnouncementDetail,
  useAnnouncementHistory,
  usePushEngagement,
  usePushMetrics,
} from "@/presentation/hooks/queries/admin";
import { isMissingAnnouncement } from "@/application/services/adminNotifications.service";
import { DEFAULT_PUSH_METRICS_WINDOW, type PushMetricsWindow } from "@/domain/admin/pushAdministration";

/**
 * "Historial y métricas" of the admin notifications section (#490): what was sent with its delivery counts, one
 * announcement in detail, and every push of the app per type plus the engagement pushes, for one shared window.
 */
export function useNotificationHistoryViewModel() {
  const { t } = useTranslation();
  const [days, setDays] = useState<PushMetricsWindow>(DEFAULT_PUSH_METRICS_WINDOW);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const history = useAnnouncementHistory();
  const metrics = usePushMetrics(days);
  const engagement = usePushEngagement(days);
  const detail = useAnnouncementDetail(selectedId);

  const typeLabel = useCallback(
    (type: string) => t(`admin.notifications.pushTypes.${type}`, { defaultValue: type }),
    [t],
  );

  const listed = selectedId ? (history.data?.find((record) => record.id === selectedId) ?? null) : null;
  const missing = selectedId !== null && detail.isError && isMissingAnnouncement(detail.error);

  return {
    t,
    history,
    metrics,
    engagement,
    days,
    setDays,
    typeLabel,
    /** The opened announcement: its fresh detail, or the history row while the detail loads. */
    selected: selectedId ? (detail.data ?? listed) : null,
    detailOpen: selectedId !== null,
    detailLoading: detail.isFetching,
    detailMissing: missing,
    detailFailed: selectedId !== null && detail.isError && !missing,
    retryDetail: detail.refetch,
    open: setSelectedId,
    close: () => setSelectedId(null),
  };
}
