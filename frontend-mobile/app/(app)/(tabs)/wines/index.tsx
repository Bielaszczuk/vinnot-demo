import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
/**
 * Wines tab container — browse/search/filter wines.
 */
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/presentation/components/ui/Feedback";
import { WineResultsList, WinesBrowseHeader } from "@/presentation/features/wine";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import type { WineType } from "@/domain/wine/wine.types";
import { useWinesBrowseViewModel } from "@/presentation/features/wine/useWinesBrowseViewModel";
import {
  createAddWineRoute,
  createWineDetailRoute,
  createWineScanRoute,
  WINE_BROWSE_ROUTE,
} from "@/presentation/navigation/wineNavigation";

export default function WinesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    search,
    setSearch,
    selectedType,
    setSelectedType,
    selectedGrape,
    setSelectedGrape,
    selectedCountry,
    selectedRegion,
    setSelectedRegion,
    openFilter,
    setOpenFilter,
    filtersExpanded,
    toggleFilters,
    page,
    wines,
    isLoading,
    totalLabel,
    isError,
    error,
    isSearching,
    isRefreshing,
    cellarWineIds,
    grapeTypes,
    wineTypes,
    countryOptions,
    regionOptions,
    hasActiveFilters,
    clearFilters,
    selectCountry,
    loadMore,
    refresh,
    retry,
  } = useWinesBrowseViewModel();
  const typeOptions = useMemo(
    () =>
      wineTypes.map((type) => ({
        value: type.value,
        label: t(`wines.types.${type.value}`, {
          defaultValue: i18n.language?.startsWith("en") ? type.nameEn : type.nameEs,
        }),
      })),
    [i18n.language, t, wineTypes],
  );
  const selectedTypeLabel = selectedType
    ? typeOptions.find((type) => type.value === selectedType)?.label
    : undefined;
  const activeFilterLabels = useMemo(
    () =>
      [selectedTypeLabel, selectedGrape, selectedCountry, selectedRegion].filter(
        Boolean,
      ) as string[],
    [selectedCountry, selectedGrape, selectedRegion, selectedTypeLabel],
  );

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={[styles.safeAreaScrim, { height: insets.top }]} />
      <WineResultsList
        wines={wines}
        isLoading={isLoading && page === 0}
        cellarWineIds={cellarWineIds}
        onWinePress={(wineItem) => router.push(createWineDetailRoute(wineItem.id))}
        onWineReviewsPress={(wineItem) =>
          router.push(createWineDetailRoute(wineItem.id, undefined, { tab: "reviews" }))
        }
        onEndReached={loadMore}
        refreshing={isRefreshing}
        onRefresh={refresh}
        contentPaddingBottom={32}
        ListHeaderComponent={
          <WinesBrowseHeader
            insetsTop={insets.top}
            totalLabel={totalLabel}
            search={search}
            isSearching={isSearching}
            onSearchChange={setSearch}
            onSearchClear={() => setSearch("")}
            filtersExpanded={filtersExpanded}
            onToggleFilters={toggleFilters}
            openFilter={openFilter}
            onOpenFilter={setOpenFilter}
            hasActiveFilters={hasActiveFilters}
            activeFilterLabels={activeFilterLabels}
            onClearFilters={clearFilters}
            selectedTypeLabel={selectedTypeLabel}
            selectedGrape={selectedGrape}
            selectedCountry={selectedCountry}
            selectedRegion={selectedRegion}
            typeOptions={typeOptions}
            grapeOptions={grapeTypes.map((grape) => ({ value: grape.name, label: grape.name }))}
            countryOptions={countryOptions.map((country) => ({ value: country, label: country }))}
            regionOptions={regionOptions.map((region) => ({ value: region, label: region }))}
            onSelectType={(value) => setSelectedType(value as WineType)}
            onSelectGrape={setSelectedGrape}
            onSelectCountry={selectCountry}
            onSelectRegion={setSelectedRegion}
            showRegionFilter={!!selectedCountry && regionOptions.length > 0}
            onScanPress={() => router.push(createWineScanRoute(WINE_BROWSE_ROUTE))}
          />
        }
        ListFooterComponent={
          isError && wines.length > 0 ? <QueryErrorState error={error} onRetry={retry} /> : undefined
        }
        ListEmptyComponent={isError ? <QueryErrorState error={error} onRetry={retry} /> :
          <EmptyState
            illustration="noWines"
            title={t("wines.noWines")}
            description={t("wines.noWinesAddDescription")}
            icon={<Search size={38} color={vinnotColors.muted} />}
            action={{
              label: t("wines.addYourWine"),
              variant: "primary",
              onPress: () => router.push(createAddWineRoute(WINE_BROWSE_ROUTE, search)),
            }}
            secondaryAction={
              hasActiveFilters ? { label: t("common.clear"), onPress: clearFilters } : undefined
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vinnotColors.canvas },
  safeAreaScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: vinnotColors.canvas,
  },
});
