import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Badge } from "@/presentation/components/ui/Badge";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import type { PushEngagement } from "@/domain/admin/announcementStats";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { notificationStyles } from "./notificationStyles";

/** Engagement pushes per type for the chosen window (#405): sent, opened, open rate, opt-outs and paused types. */
export function PushEngagementList({
  engagement,
  typeLabel,
}: {
  engagement: PushEngagement | undefined;
  typeLabel: (type: string) => string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const number = (value: number) => value.toLocaleString(locale);
  return (
    <View style={styles.content}>
      {!engagement ? (
        <Skeleton height={120} radius={radii.lg} />
      ) : engagement.types.length === 0 ? (
        <Text style={notificationStyles.help}>{t("admin.notifications.engagement.empty")}</Text>
      ) : (
        engagement.types.map((row) => {
          const cells = [
            { key: "sent", value: number(row.sent), zero: row.sent === 0 },
            { key: "opened", value: number(row.opened), zero: row.opened === 0 },
            {
              key: "openRate",
              value: row.openRate === null ? "—" : `${Math.round(row.openRate * 100)}%`,
              zero: row.openRate === null,
            },
            { key: "optedOut", value: number(row.optedOut), zero: row.optedOut === 0 },
          ];
          return (
            <View key={row.type} style={styles.type}>
              <View style={styles.top}>
                <Text style={styles.typeTitle}>{typeLabel(row.type)}</Text>
                <Badge
                  label={t(row.paused ? "admin.notifications.engagement.paused" : "admin.notifications.engagement.active")}
                  variant={row.paused ? "warning" : "success"}
                />
              </View>
              <View style={styles.grid}>
                {cells.map((cell) => (
                  <View key={cell.key} style={styles.cell}>
                    <Text style={[notificationStyles.statValue, cell.zero && notificationStyles.statZero]}>{cell.value}</Text>
                    <Text style={notificationStyles.statLabel}>{t(`admin.notifications.engagement.${cell.key}`)}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })
      )}
      <Text style={notificationStyles.help}>{t("admin.notifications.engagement.help")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  type: { borderWidth: 1, borderColor: lightTokens.borderDefault, borderRadius: radii.lg, padding: 12, gap: 8 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  typeTitle: { flex: 1, ...textStyles.labelMedium, color: lightTokens.textPrimary },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 8 },
  cell: { width: "25%", gap: 2 },
});
