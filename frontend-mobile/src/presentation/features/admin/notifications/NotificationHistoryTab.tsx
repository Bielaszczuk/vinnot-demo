import { StyleSheet, Text, View } from "react-native";
import { Spinner } from "@/presentation/components/ui/Feedback";
import { PUSH_METRICS_WINDOWS } from "@/domain/admin/pushAdministration";
import { AdminQueryError } from "../AdminQueryError";
import { AnnouncementDetailSheet } from "./AnnouncementDetailSheet";
import { AnnouncementHistoryList } from "./AnnouncementHistoryList";
import { NotificationSegmented } from "./NotificationSegmented";
import { PushEngagementList } from "./PushEngagementList";
import { PushMetricsList } from "./PushMetricsList";
import { notificationStyles } from "./notificationStyles";
import { useNotificationHistoryViewModel } from "./useNotificationHistoryViewModel";

/**
 * "Historial y métricas": the announcements sent with their counts (a row opens its detail), then every push of the
 * app per type and the engagement pushes, both for the same window.
 */
export function NotificationHistoryTab() {
  const vm = useNotificationHistoryViewModel();
  const { t } = vm;
  return (
    <View style={styles.content}>
      <AnnouncementHistoryList
        records={vm.history.data ?? []}
        loading={vm.history.isLoading}
        failed={vm.history.isError}
        retry={vm.history.refetch}
        onOpen={vm.open}
      />

      <View style={styles.window}>
        <Text style={notificationStyles.label}>{t("admin.notifications.metrics.window")}</Text>
        <View style={styles.windowRow}>
          <NotificationSegmented
            accessibilityLabel={t("admin.notifications.metrics.window")}
            value={vm.days}
            onChange={vm.setDays}
            options={PUSH_METRICS_WINDOWS.map((window) => ({
              value: window,
              label: t("admin.notifications.metrics.days", { count: window }),
            }))}
          />
          {(vm.metrics.isFetching || vm.engagement.isFetching) && <Spinner size="sm" />}
        </View>
      </View>

      <View style={notificationStyles.card}>
        <Text style={notificationStyles.heading}>{t("admin.notifications.metrics.heading")}</Text>
        <Text style={notificationStyles.help}>{t("admin.notifications.metrics.help")}</Text>
        {vm.metrics.isError ? (
          <AdminQueryError retry={vm.metrics.refetch} />
        ) : (
          <PushMetricsList metrics={vm.metrics.data} typeLabel={vm.typeLabel} />
        )}
      </View>

      <View style={notificationStyles.card}>
        <Text style={notificationStyles.heading}>{t("admin.notifications.engagement.heading")}</Text>
        {vm.engagement.isError ? (
          <AdminQueryError retry={vm.engagement.refetch} />
        ) : (
          <PushEngagementList engagement={vm.engagement.data} typeLabel={vm.typeLabel} />
        )}
      </View>

      <AnnouncementDetailSheet
        visible={vm.detailOpen}
        record={vm.selected}
        loading={vm.detailLoading}
        missing={vm.detailMissing}
        failed={vm.detailFailed}
        retry={vm.retryDetail}
        onClose={vm.close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  window: { gap: 8 },
  windowRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
});
