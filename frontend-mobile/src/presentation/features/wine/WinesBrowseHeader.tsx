import { Text, View } from "react-native";
import { ChevronRight, ScanLine, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { FilterSheet } from "@/presentation/components/ui/FilterSheet";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { SearchFilterBar } from "@/presentation/components/ui/SearchFilterBar";
import { BrowseScreenHeader } from "@/presentation/components/layout/BrowseScreenHeader";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { styles } from "./WinesBrowseHeader.styles";
import { FilterSelectButton, OptionsPanel, type HeaderOption } from "./WinesBrowseHeaderControls";
import { iconStrokes } from "@/shared/theme/tokens";

export type OpenFilter = "type" | "grape" | "country" | "region" | null;

type WinesBrowseHeaderProps = {
  insetsTop: number;
  totalLabel: string;
  search: string;
  isSearching?: boolean;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  filtersExpanded: boolean;
  onToggleFilters: () => void;
  openFilter: OpenFilter;
  onOpenFilter: (filter: OpenFilter) => void;
  hasActiveFilters: boolean;
  activeFilterLabels: string[];
  onClearFilters: () => void;
  selectedTypeLabel?: string;
  selectedGrape: string;
  selectedCountry: string;
  selectedRegion: string;
  typeOptions: HeaderOption[];
  grapeOptions: HeaderOption[];
  countryOptions: HeaderOption[];
  regionOptions: HeaderOption[];
  onSelectType: (value: string) => void;
  onSelectGrape: (value: string) => void;
  onSelectCountry: (value: string) => void;
  onSelectRegion: (value: string) => void;
  showRegionFilter: boolean;
  onScanPress: () => void;
};

export function WinesBrowseHeader({
  insetsTop,
  totalLabel,
  search,
  isSearching = false,
  onSearchChange,
  onSearchClear,
  filtersExpanded,
  onToggleFilters,
  openFilter,
  onOpenFilter,
  hasActiveFilters,
  activeFilterLabels,
  onClearFilters,
  selectedTypeLabel,
  selectedGrape,
  selectedCountry,
  selectedRegion,
  typeOptions,
  grapeOptions,
  countryOptions,
  regionOptions,
  onSelectType,
  onSelectGrape,
  onSelectCountry,
  onSelectRegion,
  showRegionFilter,
  onScanPress,
}: WinesBrowseHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.header, { paddingTop: insetsTop + 12 }]}>
      <BrowseScreenHeader
        title={t("compare.browseWines", t("wines.title"))}
        subtitle={totalLabel}
        style={styles.sharedHeader}
      >
        <SearchFilterBar
          value={search}
          onChangeText={onSearchChange}
          onClear={onSearchClear}
          placeholder={t("wines.searchPlaceholder")}
          activeFilterCount={activeFilterLabels.length}
          onFilterPress={onToggleFilters}
          isLoading={isSearching}
          filterAccessibilityLabel={t("common.filter")}
          clearAccessibilityLabel={t("common.clear")}
        />

        {activeFilterLabels.length > 0 ? (
          <View style={styles.activeFiltersSummary}>
            {activeFilterLabels.slice(0, 3).map((label) => (
              <View key={label} style={styles.activeFilterChip}>
                <Text style={styles.activeFilterChipText} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            ))}
            {hasActiveFilters ? (
              <MotionPressable onPress={onClearFilters} style={styles.clearChip}>
                <X size={13} color={vinnotColors.brand} />
                <Text style={styles.clearChipText}>{t("common.clear")}</Text>
              </MotionPressable>
            ) : null}
          </View>
        ) : null}
      </BrowseScreenHeader>

      <MotionPressable
        onPress={onScanPress}
        style={[styles.scanAction, { backgroundColor: vinnotColors.brand }]}
        accessibilityRole="button"
        accessibilityLabel={t("wines.scan")}
      >
        <View style={styles.scanIcon}>
          <ScanLine size={22} color={vinnotColors.brand} strokeWidth={iconStrokes.regular} />
        </View>
        <View style={styles.scanCopy}>
          <Text style={[styles.scanTitle, { color: vinnotColors.white }]}>{t("wines.scan")}</Text>
          <Text style={[styles.scanDescription, { color: vinnotColors.white }]}>
            {t("wines.scanDescription")}
          </Text>
        </View>
        <View style={styles.scanChevron}>
          <ChevronRight size={18} color={vinnotColors.ink} />
        </View>
      </MotionPressable>

      <FilterSheet
        visible={filtersExpanded}
        title={t("common.filter")}
        activeCount={activeFilterLabels.length}
        clearLabel={t("common.clear")}
        onClear={onClearFilters}
        onClose={onToggleFilters}
      >
        <View style={styles.selectGrid}>
          <FilterSelectButton
            label={t("wines.type")}
            value={selectedTypeLabel}
            isOpen={openFilter === "type"}
            onPress={() => onOpenFilter(openFilter === "type" ? null : "type")}
          />
          {openFilter === "type" ? (
            <OptionsPanel
              options={typeOptions}
              value={selectedTypeLabel ?? ""}
              onSelect={(value) => {
                onSelectType(value);
                onOpenFilter(null);
              }}
            />
          ) : null}
          <FilterSelectButton
            label={t("wines.grapeVariety")}
            value={selectedGrape}
            isOpen={openFilter === "grape"}
            onPress={() => onOpenFilter(openFilter === "grape" ? null : "grape")}
          />
          {openFilter === "grape" ? (
            <OptionsPanel
              options={grapeOptions}
              value={selectedGrape}
              searchable
              searchPlaceholder={`${t("common.search")} ${t("wines.grapeVariety").toLocaleLowerCase()}`}
              emptyLabel={t("common.noResults")}
              onSelect={(value) => {
                onSelectGrape(value);
                onOpenFilter(null);
              }}
            />
          ) : null}
          <FilterSelectButton
            label={t("wines.country", "País")}
            value={selectedCountry}
            isOpen={openFilter === "country"}
            onPress={() => onOpenFilter(openFilter === "country" ? null : "country")}
          />
          {openFilter === "country" ? (
            <OptionsPanel
              options={countryOptions}
              value={selectedCountry}
              searchable
              searchPlaceholder={`${t("common.search")} ${t("wines.country", "País").toLocaleLowerCase()}`}
              emptyLabel={t("common.noResults")}
              onSelect={(value) => {
                onSelectCountry(value);
                onOpenFilter(null);
              }}
            />
          ) : null}
          {showRegionFilter ? (
            <>
              <FilterSelectButton
                label={t("wines.region")}
                value={selectedRegion}
                isOpen={openFilter === "region"}
                onPress={() => onOpenFilter(openFilter === "region" ? null : "region")}
              />
              {openFilter === "region" ? (
                <OptionsPanel
                  options={regionOptions}
                  value={selectedRegion}
                  searchable
                  searchPlaceholder={`${t("common.search")} ${t("wines.region").toLocaleLowerCase()}`}
                  emptyLabel={t("common.noResults")}
                  onSelect={(value) => {
                    onSelectRegion(value);
                    onOpenFilter(null);
                  }}
                />
              ) : null}
            </>
          ) : null}
        </View>
      </FilterSheet>
    </View>
  );
}
