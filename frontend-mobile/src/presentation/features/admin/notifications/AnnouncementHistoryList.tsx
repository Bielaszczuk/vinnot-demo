import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Badge } from "@/presentation/components/ui/Badge";
import { Skeleton, EmptyState } from "@/presentation/components/ui/Feedback";
import { AdminQueryError } from "../AdminQueryError";
import type { AnnouncementRecord } from "@/domain/admin/announcement";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { notificationStyles } from "./notificationStyles";

/** Every send and test with its status and what reached people so far; a row opens its detail. */
export function AnnouncementHistoryList({
  records,
  loading,
  failed,
  retry,
  onOpen,
}: {
  records: AnnouncementRecord[];
  loading: boolean;
  failed: boolean;
  retry: () => unknown;
  onOpen: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  return (
    <View style={notificationStyles.card}>
      <Text style={notificationStyles.heading}>{t("admin.notifications.history.heading")}</Text>
      <Text style={notificationStyles.help}>{t("admin.notifications.history.help")}</Text>
      {failed ? (
        <AdminQueryError retry={retry} />
      ) : loading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} height={64} radius={radii.lg} />
          ))}
        </View>
      ) : records.length === 0 ? (
        <EmptyState illustration="notifications" title={t("admin.notifications.history.empty")} style={styles.emptyState} />
      ) : (
        <View style={styles.list}>
          {records.map((record) => (
            <Pressable
              key={record.id}
              accessibilityRole="button"
              accessibilityLabel={t("admin.notifications.history.open", { title: record.title })}
              onPress={() => onOpen(record.id)}
              style={styles.row}
            >
              <View style={styles.top}>
                <Text style={styles.title} numberOfLines={2}>
                  {record.title}
                </Text>
                <Badge
                  label={t(record.completedAt ? "admin.notifications.history.completed" : "admin.notifications.history.sending")}
                  variant={record.completedAt ? "success" : "info"}
                />
              </View>
              <Text style={styles.meta}>
                {[
                  t(`admin.notifications.kinds.${record.kind}.title`),
                  t("admin.notifications.history.recipientCount", { count: record.recipients }),
                  new Date(record.createdAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }),
                ].join(" · ")}
              </Text>
              {record.audience.email && (
                <Text style={styles.stats}>
                  {t("admin.notifications.history.emailSummary", {
                    sent: record.stats.emailsSent,
                    failed: record.stats.emailsFailed,
                  })}
                </Text>
              )}
              {record.audience.push && (
                <Text style={styles.stats}>
                  {t("admin.notifications.history.pushSummary", {
                    sent: record.stats.pushesSent,
                    opened: record.stats.pushesOpened,
                    failed: record.stats.pushesFailed,
                  })}
                </Text>
              )}
              <View style={styles.bottom}>
                {record.test ? <Badge label={t("admin.notifications.history.test")} variant="warning" /> : <View />}
                <View style={styles.more}>
                  <Text style={styles.moreText}>{t("admin.notifications.history.details")}</Text>
                  <ChevronRight size={14} color={lightTokens.textBrand} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  emptyState: { flex: 0, padding: 16 },
  row: {
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.lg,
    padding: 12,
    gap: 4,
  },
  top: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  title: { flex: 1, ...textStyles.titleSmall, color: lightTokens.textPrimary },
  meta: { ...textStyles.caption, color: lightTokens.textSecondary },
  stats: { ...textStyles.caption, color: lightTokens.textPrimary },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  more: { flexDirection: "row", alignItems: "center", gap: 2 },
  moreText: { ...textStyles.labelSmall, color: lightTokens.textBrand },
});
