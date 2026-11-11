import { createWineRouteDetailRoute } from "@/presentation/navigation/discoveryNavigation";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
/**
 * Wine Routes List Screen.
 */
import type { ReactNode } from "react";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { Check, Map } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { BrowseScreenHeader } from "@/presentation/components/layout/BrowseScreenHeader";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { FilterSheet } from "@/presentation/components/ui/FilterSheet";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { SearchFilterBar } from "@/presentation/components/ui/SearchFilterBar";
import {
  ROUTE_DIFFICULTY_OPTIONS,
  RouteDifficultyGlyph,
  useWineRoutesListViewModel,
  WineRouteCard,
} from "@/presentation/features/wineRoute";
import { editorial, lightTokens, wine, layout, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import type { RouteDifficulty, WineRoute } from "@/domain/route/route.types";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { useCountryName } from "@/presentation/hooks/useCountryName";
import { vinnotColors } from "@/shared/theme/vinnotTheme";

export default function WineRoutesScreen() {
  const { t } = useTranslation();
  const countryName = useCountryName();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const {
    search,
    setSearch,
    selectedDifficulty,
    setSelectedDifficulty,
    selectedCountry,
    selectedRegion,
    setSelectedRegion,
    countryOptions,
    regionOptions,
    filteredRoutes,
    routesQuery,
    page,
    isRefreshing,
    hasActiveFilters,
    clearFilters,
    selectCountry,
    loadMore,
    refresh,
  } = useWineRoutesListViewModel();

  const activeFilterCount =
    Number(selectedDifficulty !== "ALL") +
    Number(Boolean(selectedCountry)) +
    Number(Boolean(selectedRegion));

  const activeFilterSummary = [
    selectedDifficulty !== "ALL"
      ? t(`wineRoutes.difficulty.${selectedDifficulty}`, selectedDifficulty)
      : null,
    countryName(selectedCountry),
    selectedRegion,
  ]
    .filter(Boolean)
    .join(" · ");

  const header = (
    <View style={styles.headerWrap}>
      <BrowseScreenHeader
        title={t("wineRoutes.title")}
        subtitle={t("wineRoutes.subtitle")}
        style={[styles.browseHeader, { paddingTop: insets.top + 12 }]}
      >
        <SearchFilterBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch("")}
          placeholder={t("wineRoutes.searchPlaceholder")}
          activeFilterCount={activeFilterCount}
          onFilterPress={() => setFiltersOpen(true)}
          isLoading={routesQuery.isFetching && search.trim().length > 0}
          filterAccessibilityLabel={t("common.filter")}
          clearAccessibilityLabel={t("common.clear")}
        />
        {activeFilterSummary ? (
          <Text style={styles.filterSummary} numberOfLines={2}>
            {activeFilterSummary}
          </Text>
        ) : null}
      </BrowseScreenHeader>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{t("wineRoutes.explore")}</Text>
          <Text style={styles.resultCount}>
            {t("wineRoutes.availableCount", { count: filteredRoutes.length })}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      {routesQuery.isLoading && page === 0 ? (
        <ScrollView
          contentContainerStyle={[styles.loadingContent, { paddingBottom: insets.bottom + 24 }]}
        >
          {header}
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={319} radius={radii["2xl"]} />
          ))}
        </ScrollView>
      ) : (
        <FlashList<WineRoute>
          data={filteredRoutes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WineRouteCard
              route={item}
              onPress={() => router.push(createWineRouteDetailRoute(item.id))}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <>
              {header}
              {routesQuery.isError && (
                <QueryErrorState error={routesQuery.error} onRetry={refresh} />
              )}
            </>
          }
          ListEmptyComponent={
            routesQuery.isError ? null : (
              <EmptyState
                illustration="route"
                title={hasActiveFilters ? t("common.noResults") : t("wineRoutes.noRoutes")}
                description={
                  hasActiveFilters ? t("wineRoutes.noRoutesSearch") : t("wineRoutes.noRoutesDesc")
                }
                icon={<Map size={34} color={wine[700]} />}
              />
            )
          }
          contentContainerStyle={{
            paddingHorizontal: layout.screenHorizontalPadding,
            paddingBottom: insets.bottom + 24,
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<BrandRefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FilterSheet
        visible={filtersOpen}
        title={t("common.filter")}
        activeCount={activeFilterCount}
        clearLabel={t("common.clear")}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
      >
        <FilterSection title={t("wineRoutes.difficultyLabel")}>
          <FilterOption
            label={t("wineRoutes.all")}
            selected={selectedDifficulty === "ALL"}
            onPress={() => setSelectedDifficulty("ALL")}
          />
          {ROUTE_DIFFICULTY_OPTIONS.map(({ value }) => (
            <FilterOption
              key={value}
              label={t(`wineRoutes.difficulty.${value}`, value)}
              selected={selectedDifficulty === value}
              onPress={() => setSelectedDifficulty(value)}
              icon={
                <RouteDifficultyGlyph
                  difficulty={value as RouteDifficulty}
                  size={17}
                  color={editorial.brand}
                />
              }
            />
          ))}
        </FilterSection>

        {countryOptions.length > 0 ? (
          <FilterSection title={t("common.selectCountry")}>
            <FilterOption
              label={t("wineRoutes.allCountries")}
              selected={!selectedCountry}
              onPress={() => selectCountry(null)}
            />
            {countryOptions.map((country) => (
              <FilterOption
                key={country}
                label={countryName(country)}
                selected={selectedCountry === country}
                onPress={() => selectCountry(country)}
              />
            ))}
          </FilterSection>
        ) : null}

        {selectedCountry && regionOptions.length > 0 ? (
          <FilterSection title={t("common.selectRegion")}>
            <FilterOption
              label={t("wineRoutes.allRegions")}
              selected={!selectedRegion}
              onPress={() => setSelectedRegion(null)}
            />
            {regionOptions.map((region) => (
              <FilterOption
                key={region}
                label={region}
                selected={selectedRegion === region}
                onPress={() => setSelectedRegion(region)}
              />
            ))}
          </FilterSection>
        ) : null}
      </FilterSheet>
    </View>
  );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>{title}</Text>
      <View style={styles.filterOptions}>{children}</View>
    </View>
  );
}

function FilterOption({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: ReactNode;
}) {
  return (
    <MotionPressable
      onPress={onPress}
      style={[styles.filterOption, selected && styles.filterOptionSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={styles.filterOptionLabel}>
        {icon}
        <Text style={[styles.filterOptionText, selected && styles.filterOptionTextSelected]}>
          {label}
        </Text>
      </View>
      {selected ? <Check size={18} color={editorial.brand} /> : null}
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vinnotColors.canvas },
  headerWrap: { gap: 18, marginBottom: 18 },
  browseHeader: { paddingBottom: 0 },
  filterSummary: { ...textStyles.caption, color: lightTokens.brandPrimary, lineHeight: 18 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: { ...textStyles.titleLarge, color: lightTokens.textPrimary },
  resultCount: { ...textStyles.caption, color: lightTokens.textTertiary },
  loadingContent: { gap: 16, paddingHorizontal: layout.screenHorizontalPadding },
  separator: { height: 14 },
  filterSection: { gap: 8 },
  filterSectionTitle: { ...textStyles.overline, color: lightTokens.textTertiary },
  filterOptions: {
    overflow: "hidden",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
  },
  filterOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
    paddingHorizontal: 14,
  },
  filterOptionSelected: { backgroundColor: lightTokens.bgMuted },
  filterOptionLabel: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 9 },
  filterOptionText: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
  filterOptionTextSelected: { ...textStyles.labelLarge, color: editorial.brand },
});
