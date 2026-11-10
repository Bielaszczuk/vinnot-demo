import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { PUSH_OUTCOMES, type PushMetrics } from "@/domain/admin/pushAdministration";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { notificationStyles } from "./notificationStyles";

/** Outcomes of every push of the app per type for the chosen window, one card per type instead of a wide table. */
export function PushMetricsList({
  metrics,
  typeLabel,
}: {
  metrics: PushMetrics | undefined;
  typeLabel: (type: string) => string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  return (
    <View style={styles.content}>
      {!metrics ? (
        <Skeleton height={120} radius={radii.lg} />
      ) : metrics.types.length === 0 ? (
        <Text style={notificationStyles.help}>{t("admin.notifications.metrics.empty")}</Text>
      ) : (
        metrics.types.map((row) => (
          <View key={row.type} style={styles.type}>
            <Text style={styles.typeTitle}>{typeLabel(row.type)}</Text>
            <View style={styles.grid}>
              {PUSH_OUTCOMES.map((outcome) => (
                <View key={outcome} style={styles.cell}>
                  <Text style={[notificationStyles.statValue, row.counts[outcome] === 0 && notificationStyles.statZero]}>
                    {row.counts[outcome].toLocaleString(locale)}
                  </Text>
                  <Text style={notificationStyles.statLabel}>{t(`admin.notifications.metrics.outcomes.${outcome}`)}</Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
      <Text style={notificationStyles.help}>{t("admin.notifications.metrics.legend")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  type: { borderWidth: 1, borderColor: lightTokens.borderDefault, borderRadius: radii.lg, padding: 12, gap: 8 },
  typeTitle: { ...textStyles.labelMedium, color: lightTokens.textPrimary },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 8 },
  cell: { width: "25%", gap: 2 },
});
