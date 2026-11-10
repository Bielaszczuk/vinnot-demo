/** Points, tier name and the bar to the next tier. */
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { tierProgress } from "@/domain/points/badgeTiers";
import type { PointsSummary } from "@/domain/points/points.types";
import { lightTokens, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

export function PointsProgress({ summary }: { summary: PointsSummary }) {
  const { t } = useTranslation();
  const progress = tierProgress(summary);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.points}>{t("points.pointsCount", { count: summary.points })}</Text>
      <Text style={styles.tier}>{t(`points.tiers.${summary.tier}`)}</Text>
      <View style={styles.bar} accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress.fraction * 100) }}>
        <View style={[styles.fill, { width: `${progress.fraction * 100}%` }]} />
      </View>
      <Text style={styles.next}>
        {progress.nextTier
          ? t("points.toNext", { count: progress.remaining, tier: t(`points.tiers.${progress.nextTier}`) })
          : t("points.topTier")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, gap: 3 },
  points: { ...textStyles.titleLarge, color: lightTokens.textBrand, fontVariant: ["tabular-nums"] },
  tier: { ...textStyles.labelMedium, color: lightTokens.textSecondary },
  bar: { height: 8, borderRadius: radii.full, backgroundColor: wine[100], overflow: "hidden", marginTop: 6 },
  fill: { height: "100%", borderRadius: radii.full, backgroundColor: wine[700] },
  next: { ...textStyles.caption, color: lightTokens.textTertiary, marginTop: 2 },
});
