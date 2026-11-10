/**
 * Wineries list screen.
 */
import { StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Building2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/presentation/components/layout";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";
import { SearchField } from "@/presentation/components/ui/TextField";
import { WineryCard } from "@/presentation/features/winery";
import { editorial, lightTokens, layout, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { useWineriesListViewModel } from "@/presentation/features/winery/useWineriesListViewModel";

export default function WineriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { formatNumber } = useFormatters();
  const {
    search,
    setSearch,
    page,
    wineries,
    data,
    isLoading,
    isRefreshing,
    isError,
    loadMore,
    refresh,
  } = useWineriesListViewModel();

  const header = (
    <View style={styles.header}>
      <View style={styles.hero}>
        <View style={styles.brandRail} />
        <View style={styles.heroContent}>
          <View style={styles.heading}>
            <View style={styles.titleIcon}>
              <Building2 size={20} color={lightTokens.brandPrimary} />
            </View>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>{t("wineries.title")}</Text>
              <Text style={styles.subtitle}>
                {formatNumber(data?.pagination.totalItems ?? wineries.length)} {t("common.available")}
              </Text>
            </View>
          </View>
          <SearchField
            value={search}
            onChangeText={setSearch}
            onClear={() => setSearch("")}
            placeholder={t("wineries.searchPlaceholder")}
          />
        </View>
      </View>
    </View>
  );

  if (isLoading && page === 0) {
    return (
      <View style={styles.screen}>
        <AppHeader title={t("wineries.title")} showBack />
        {header}
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.skeletonItem}>
              <Skeleton height={210} radius={radii.md} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader title={t("wineries.title")} showBack />
      <FlashList
        data={wineries}
        numColumns={2}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            illustration={isError ? "server" : "winery"}
            title={isError ? t("common.error") : t("wineries.noWineries")}
            description={isError ? t("common.retry") : t("wineries.noWineriesSearch")}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<BrandRefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <WineryCard winery={item} onPress={() => router.push(`/(app)/wineries/${item.id}`)} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgSubtle },
  header: { paddingHorizontal: layout.screenHorizontalPadding, paddingBottom: 10 },
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  brandRail: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: editorial.brandDeep,
  },
  heroContent: { padding: 18, gap: 14 },
  heading: { flexDirection: "row", alignItems: "center", gap: 12 },
  headingCopy: { flex: 1, minWidth: 0, gap: 2 },
  titleIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: lightTokens.bgMuted,
  },
  title: { ...textStyles.headingLarge, color: lightTokens.textPrimary },
  subtitle: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  item: { flex: 1, padding: 6 },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 14 },
  skeletonItem: { width: "50%", padding: 6 },
});
