/**
 * StatsRow — user profile stats.
 */
import { StyleSheet, Text, View } from "react-native";
import { CalendarDays, ChevronRight, Map, Star, Wine } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { lightTokens, radii, wine, iconStrokes } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import type { UserStats } from "@/domain/user/user.types";

interface StatsRowProps {
  stats?: UserStats;
  loading?: boolean;
  showOrganizerStats?: boolean;
  /** Events the organizer runs; when known it replaces the attended count on the organizer card. */
  organizedEvents?: number;
  onCellarPress: () => void;
}

export function StatsRow({
  stats,
  loading = false,
  showOrganizerStats = false,
  organizedEvents,
  onCellarPress,
}: StatsRowProps) {
  const { t } = useTranslation();

  const items = [
    {
      key: "cellar",
      label: t("profile.winesInCellar"),
      value: stats?.cellarSize ?? 0,
      icon: <Wine size={19} color={wine[700]} strokeWidth={iconStrokes.regular} />,
    },
    {
      key: "reviews",
      label: t("profile.reviews"),
      value: stats?.totalReviews ?? 0,
      icon: <Star size={19} color={wine[700]} strokeWidth={iconStrokes.regular} />,
    },
    {
      key: "events",
      label: organizedEvents === undefined ? t("profile.events") : t("profile.organizedEvents"),
      value: organizedEvents ?? stats?.totalEventsAttended ?? 0,
      icon: <CalendarDays size={19} color={wine[700]} strokeWidth={iconStrokes.regular} />,
    },
    {
      key: "routes",
      label: t("profile.routes"),
      value: stats?.totalRoutesCompleted ?? 0,
      icon: <Map size={19} color={wine[700]} strokeWidth={iconStrokes.regular} />,
    },
  ].filter((item) => showOrganizerStats || item.key === "cellar" || item.key === "reviews");

  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const content = (
          <>
            <View style={styles.cardTop}>
              <View style={styles.icon}>{item.icon}</View>
              <Text style={styles.value}>{loading ? "—" : item.value}</Text>
            </View>
            <View style={styles.labelRow}>
              <Text numberOfLines={2} style={styles.label}>
                {item.label}
              </Text>
              {item.key === "cellar" && <ChevronRight size={16} color={wine[700]} />}
            </View>
          </>
        );
        return item.key === "cellar" ? (
          <MotionPressable
            key={item.key}
            style={[styles.card, styles.actionCard]}
            accessibilityRole="button"
            accessibilityLabel={t("profile.openCellar")}
            onPress={onCellarPress}
          >
            {content}
          </MotionPressable>
        ) : (
          <View key={item.key} style={styles.card}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48.5%",
    minHeight: 108,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    borderRadius: radii.lg,
    padding: 15,
    backgroundColor: lightTokens.surfaceDefault,
  },
  actionCard: { borderColor: wine[200] },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  cardTop: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: wine[50],
    borderWidth: 1,
    borderColor: wine[100],
  },
  value: { ...textStyles.headingMedium, color: lightTokens.textPrimary },
  label: {
    ...textStyles.caption,
    color: lightTokens.textSecondary,
    flex: 1,
  },
});
