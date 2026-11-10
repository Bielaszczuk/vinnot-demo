import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Badge } from "@/presentation/components/ui/Badge";
import { Skeleton, Spinner } from "@/presentation/components/ui/Feedback";
import type { AnnouncementRecord } from "@/domain/admin/announcement";
import { announcementStatKeys, pushOpenRate } from "@/domain/admin/announcementStats";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { AdminDetailSheet } from "../AdminDetailSheet";
import { AdminQueryError } from "../AdminQueryError";
import { notificationStyles } from "./notificationStyles";

/**
 * One announcement of the history with its latest delivery counts (#490). Every count carries a short hint, because
 * they are not all of the same unit (accounts or messages) and some are partial (opens, late bounces).
 */
export function AnnouncementDetailSheet({
  visible,
  record,
  loading,
  missing,
  failed,
  retry,
  onClose,
}: {
  visible: boolean;
  record: AnnouncementRecord | null;
  loading: boolean;
  /** The backend no longer has it (404). */
  missing: boolean;
  failed: boolean;
  retry: () => unknown;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const date = (value: string) => new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  const rate = record ? pushOpenRate(record.stats) : null;
  const channels = record
    ? [record.audience.email && t("admin.notifications.audience.email"), record.audience.push && t("admin.notifications.audience.push")]
        .filter(Boolean)
        .join(" + ")
    : "";
  return (
    <AdminDetailSheet
      visible={visible}
      title={record?.title ?? t("admin.notifications.history.title")}
      subtitle={record ? t(`admin.notifications.kinds.${record.kind}.title`) : undefined}
      onClose={onClose}
    >
      {missing ? (
        <Text accessibilityRole="alert" style={styles.notice}>
          {t("admin.notifications.stats.notFound")}
        </Text>
      ) : null}
      {failed && <AdminQueryError retry={retry} />}
      {!record ? (
        !missing && <Skeleton height={240} radius={radii.lg} />
      ) : (
        <View style={styles.content}>
          <View style={styles.badges}>
            <Badge
              label={t(record.completedAt ? "admin.notifications.history.completed" : "admin.notifications.history.sending")}
              variant={record.completedAt ? "success" : "info"}
            />
            {record.test && <Badge label={t("admin.notifications.history.test")} variant="warning" />}
            {loading && <Spinner size="sm" />}
          </View>

          <View style={styles.facts}>
            {[
              { key: "channels", value: channels },
              { key: "recipients", value: t("admin.notifications.history.recipientCount", { count: record.recipients }) },
              { key: "sentBy", value: record.sentBy },
              { key: "createdAt", value: date(record.createdAt) },
              {
                key: "completedAt",
                value: record.completedAt ? date(record.completedAt) : t("admin.notifications.history.sending"),
              },
            ].map((fact) => (
              <View key={fact.key} style={styles.fact}>
                <Text style={styles.factLabel}>{t(`admin.notifications.stats.facts.${fact.key}`)}</Text>
                <Text style={styles.factValue}>{fact.value}</Text>
              </View>
            ))}
          </View>

          <View style={notificationStyles.card}>
            <Text style={notificationStyles.heading}>{t("admin.notifications.stats.heading")}</Text>
            {announcementStatKeys(record.audience).map((key) => (
              <View key={key} style={styles.stat}>
                <View style={styles.statTop}>
                  <Text style={styles.statLabel}>{t(`admin.notifications.stats.labels.${key}`)}</Text>
                  <Text style={[notificationStyles.statValue, record.stats[key] === 0 && notificationStyles.statZero]}>
                    {record.stats[key].toLocaleString(locale)}
                  </Text>
                </View>
                {key === "pushesOpened" && rate !== null && (
                  <Text style={styles.rate}>{t("admin.notifications.stats.openRate", { rate: Math.round(rate * 100) })}</Text>
                )}
                <Text style={notificationStyles.help}>{t(`admin.notifications.stats.hints.${key}`)}</Text>
              </View>
            ))}
            {record.test && <Text style={notificationStyles.help}>{t("admin.notifications.stats.testNote")}</Text>}
            <Text style={notificationStyles.help}>{t("admin.notifications.stats.liveNote")}</Text>
          </View>
        </View>
      )}
    </AdminDetailSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  notice: {
    ...textStyles.bodySmall,
    color: lightTokens.textSecondary,
    backgroundColor: lightTokens.bgSubtle,
    borderRadius: radii.lg,
    padding: 14,
  },
  badges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  facts: { gap: 10 },
  fact: { gap: 2 },
  factLabel: { ...textStyles.overline, color: lightTokens.textTertiary },
  factValue: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
  stat: {
    gap: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: lightTokens.borderDefault,
  },
  statTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  statLabel: { flex: 1, ...textStyles.labelMedium, color: lightTokens.textPrimary },
  rate: { ...textStyles.caption, color: lightTokens.textBrand },
});
