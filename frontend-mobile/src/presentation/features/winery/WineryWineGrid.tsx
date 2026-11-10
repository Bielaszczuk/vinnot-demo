/**
 * WineryWineGrid — wines inside winery detail.
 */
import { StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { WineCard } from "@/presentation/features/wine";
import { lightTokens } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import type { WineSummary } from "@/domain/wine/wine.types";
import { createWineDetailRoute } from "@/presentation/navigation/wineNavigation";

interface WineryWineGridProps {
  wines: WineSummary[];
  isLoading?: boolean;
}

export function WineryWineGrid({ wines, isLoading }: WineryWineGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View style={styles.grid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.item}>
            <Skeleton height={260} radius={20} />
          </View>
        ))}
      </View>
    );
  }

  if (wines.length === 0) {
    return (
      <EmptyState
        illustration="noWines"
        title={t("wineries.noPublishedWines")}
        style={styles.empty}
      />
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{t("wineries.winesOfWinery")}</Text>
      <View style={styles.grid}>
        {wines.map((wine) => (
          <View key={wine.id} style={styles.item}>
            <WineCard
              wine={wine}
              onPress={() =>
                router.push(createWineDetailRoute(wine.id, pathname))
              }
              onReviewsPress={() =>
                router.push(createWineDetailRoute(wine.id, pathname, { tab: "reviews" }))
              }
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  item: { width: "50%", padding: 6 },
  empty: { minHeight: 180 },
});
