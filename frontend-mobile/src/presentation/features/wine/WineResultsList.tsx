/**
 * WineResultsList — virtualized mobile wine grid.
 */
import { StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import type { ReactElement } from "react";
import { WineGlassMark } from "@/presentation/components/brand/WineGlassMark";
import { WineCard } from "./WineCard";
import { layout } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import type { WineSummary } from "@/domain/wine/wine.types";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { fontSizes } from "@/shared/theme/typography";

interface WineResultsListProps {
  wines: WineSummary[];
  isLoading?: boolean;
  cellarWineIds?: ReadonlySet<string>;
  onWinePress: (wine: WineSummary) => void;
  /** Opens the wine straight on its reviews from the card's review count. */
  onWineReviewsPress?: (wine: WineSummary) => void;
  ListEmptyComponent?: ReactElement;
  ListHeaderComponent?: ReactElement;
  /** Shown after the loaded wines, for example when a later page fails. */
  ListFooterComponent?: ReactElement;
  contentPaddingBottom?: number;
  onEndReached?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

function WineSearchLoading() {
  const { t } = useTranslation();

  return (
    <View style={styles.loading}>
      <WineGlassMark size={54} animated />
      <Text style={styles.loadingTitle}>{t("wines.searching")}</Text>
      <Text style={styles.loadingDescription}>
        {t("wines.searchingDescription", "Estamos seleccionando las mejores coincidencias.")}
      </Text>
    </View>
  );
}

export function WineResultsList({
  wines,
  isLoading,
  cellarWineIds,
  onWinePress,
  onWineReviewsPress,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
  contentPaddingBottom = 24,
  onEndReached,
  refreshing = false,
  onRefresh,
}: WineResultsListProps) {
  return (
    <FlashList
      data={isLoading ? [] : wines}
      numColumns={2}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={isLoading ? <WineSearchLoading /> : ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      // The filter sheet opens from the list header, so touches inside it bubble through this list.
      // Without "handled", the list takes the first tap while the keyboard is open and only closes it.
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <BrandRefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
      renderItem={({ item, index }) => (
        <Animated.View
          entering={FadeInUp.delay(Math.min(index, 6) * 45).duration(340)}
          style={styles.item}
        >
          <WineCard
            wine={item}
            isInCellar={cellarWineIds?.has(item.id)}
            onPress={() => onWinePress(item)}
            onReviewsPress={onWineReviewsPress ? () => onWineReviewsPress(item) : undefined}
          />
        </Animated.View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  loading: {
    minHeight: 270,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: layout.screenHorizontalPadding + 18,
  },
  loadingTitle: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.md,
    lineHeight: 23,
    letterSpacing: 0,
    color: vinnotColors.ink,
    textAlign: "center",
  },
  loadingDescription: {
    maxWidth: 270,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 19,
    letterSpacing: 0,
    color: vinnotColors.muted,
    textAlign: "center",
  },
});
