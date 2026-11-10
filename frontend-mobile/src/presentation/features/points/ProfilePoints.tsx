/**
 * Points in the profile header (S7): the emblem, the points, the tier and the bar to the
 * next tier. Tapping the emblem opens "Tus puntos".
 */
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { PointsSummary } from "@/domain/points/points.types";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { PointsProgress } from "./PointsProgress";
import { UserBadge } from "./UserBadge";

interface ProfilePointsProps {
  summary: PointsSummary | undefined;
  loading: boolean;
  onOpen: () => void;
}

export function ProfilePoints({ summary, loading, onOpen }: ProfilePointsProps) {
  const { t } = useTranslation();
  if (!summary) return loading ? <Skeleton height={96} radius={16} /> : null;
  return (
    <View style={styles.row} testID="profile-points">
      <UserBadge tier={summary.tier} size="profile" mode="loop" interactive onPress={onOpen}
        accessibilityLabel={`${t("points.badgeLabel", { tier: t(`points.tiers.${summary.tier}`) })}. ${t("points.openDetails")}`}
        accessibilityHint={t("points.openDetailsHint")} />
      <PointsProgress summary={summary} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 16, paddingTop: 4 },
});
