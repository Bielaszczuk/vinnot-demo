/**
 * Wine Compare Screen — mobile parity for web /wines/compare.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View, type ScrollViewInstance } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GitCompareArrows, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Badge } from "@/presentation/components/ui/Atoms";
import { RatingGlasses } from "@/presentation/features/wine/rating/RatingGlasses";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { Spinner } from "@/presentation/components/ui/Feedback";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";
import { WineImage } from "@/presentation/features/wine/WineImage";
import { SearchField } from "@/presentation/components/ui/TextField";
import {
  CompareLoadingSteps,
  WINE_COMPARISON_JOURNEY_MINIMUM_DURATION_MS,
  WineComparisonErrorState,
} from "@/presentation/features/wine";
import { ComparisonResults } from "@/presentation/features/wine/compare/ComparisonResults";
import { useWineComparison, useWineDetail, useWines } from "@/presentation/hooks/queries/wine";
import { useDebounce } from "@/presentation/hooks/ui";
import { useProcessJourneyVisibility } from "@/presentation/hooks/useProcessJourneyVisibility";
import { radii, iconStrokes } from "@/shared/theme/tokens";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import type { Wine, WineSummary } from "@/domain/wine/wine.types";
import { styles } from "@/presentation/features/wine/compare.styles";
import { createWineDetailRoute, WINE_BROWSE_ROUTE } from "@/presentation/navigation/wineNavigation";
import { BackButton } from "@/presentation/components/ui/BackButton";

const SEARCH_PAGE_SIZE = 12;

interface RequestedComparison {
  wineAId: string;
  wineBId: string;
}

export default function WineCompareScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const shouldScrollToJourney = useRef(false);
  const params = useLocalSearchParams<{
    wineAId?: string;
    compareWith?: string;
  }>();

  const [wineAId, setWineAId] = useState<string | null>(null);
  const [wineBId, setWineBId] = useState<string | null>(null);
  const [selectingFor, setSelectingFor] = useState<"A" | "B">("B");
  const [search, setSearch] = useState("");
  const [requestedComparison, setRequestedComparison] = useState<RequestedComparison | null>(null);
  const debouncedSearch = useDebounce(search.trim(), 300);
  const resolvedWineAId = wineAId ?? params.wineAId ?? "";
  const resolvedWineBId = wineBId ?? params.compareWith ?? "";

  const { data: wineA } = useWineDetail(resolvedWineAId || undefined);
  const { data: wineB } = useWineDetail(resolvedWineBId || undefined);
  const { data: searchData, isFetching: isSearching } = useWines(
    debouncedSearch.length >= 2 ? { search: debouncedSearch } : undefined,
    0,
    SEARCH_PAGE_SIZE,
  );
  const {
    currentData: comparison,
    isFetching: isComparing,
    isSuccess: isComparisonReady,
    isError: isComparisonError,
    error: comparisonError,
    refetch: refetchComparison,
  } = useWineComparison(requestedComparison?.wineAId, requestedComparison?.wineBId);
  const {
    visible: comparisonJourneyVisible,
    start: startComparisonJourney,
    complete: completeComparisonJourney,
    cancel: cancelComparisonJourney,
  } = useProcessJourneyVisibility({
    minimumDurationMs: WINE_COMPARISON_JOURNEY_MINIMUM_DURATION_MS,
  });

  const searchResults = debouncedSearch.length >= 2 ? (searchData?.items ?? []) : [];
  const hasBothWines = !!resolvedWineAId && !!resolvedWineBId;
  const hasDistinctWines = hasBothWines && resolvedWineAId !== resolvedWineBId;
  const showWineSearch = selectingFor === "A" ? !resolvedWineAId : !resolvedWineBId;
  const canCompare = hasDistinctWines && !isComparing && !comparisonJourneyVisible;
  const isCurrentComparison =
    requestedComparison?.wineAId === resolvedWineAId &&
    requestedComparison?.wineBId === resolvedWineBId;

  useEffect(() => {
    if (!isCurrentComparison) return;
    if (isComparisonError && !isComparing) {
      cancelComparisonJourney();
      return;
    }
    if (isComparisonReady && comparison) {
      completeComparisonJourney();
    }
  }, [
    cancelComparisonJourney,
    comparison,
    completeComparisonJourney,
    isComparisonError,
    isComparing,
    isComparisonReady,
    isCurrentComparison,
  ]);

  const selectWine = (wine: WineSummary) => {
    if (selectingFor === "A") setWineAId(wine.id);
    if (selectingFor === "B") setWineBId(wine.id);
    cancelComparisonJourney();
    setRequestedComparison(null);
    setSearch("");
  };

  const clearAll = () => {
    cancelComparisonJourney();
    setWineAId("");
    setWineBId("");
    setRequestedComparison(null);
    setSearch("");
  };

  const clearSelectedWine = (slot: "A" | "B") => {
    cancelComparisonJourney();
    if (slot === "A") setWineAId("");
    if (slot === "B") setWineBId("");
    setSelectingFor(slot);
    setRequestedComparison(null);
    setSearch("");
  };

  const compareSelectedWines = () => {
    if (!canCompare) return;
    shouldScrollToJourney.current = true;
    startComparisonJourney();
    if (isCurrentComparison) {
      void refetchComparison();
      return;
    }
    setRequestedComparison({
      wineAId: resolvedWineAId,
      wineBId: resolvedWineBId,
    });
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (resolvedWineAId) {
      router.replace(createWineDetailRoute(resolvedWineAId, WINE_BROWSE_ROUTE));
      return;
    }
    router.replace(WINE_BROWSE_ROUTE);
  };

  return (
    <KeyboardAwareScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 32 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <BackButton onPress={goBack} />

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <GitCompareArrows size={22} color={vinnotColors.brand} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t("compare.title", "Comparar vinos")}</Text>
          <Text style={styles.subtitle}>
            {t("compare.subtitle", "Seleccioná dos vinos para comparar lado a lado")}
          </Text>
        </View>
        {(resolvedWineAId || resolvedWineBId) && (
          <Pressable onPress={clearAll} style={styles.clearButton}>
            <X size={16} color={vinnotColors.muted} />
          </Pressable>
        )}
      </View>

      <View style={styles.selectedGrid}>
        <SelectedWineCard
          slot="A"
          label={t("compare.wineA", "Vino A")}
          wine={wineA}
          selected={!!resolvedWineAId}
          active={selectingFor === "A" && !resolvedWineAId}
          onSelect={() => setSelectingFor("A")}
          onClear={() => clearSelectedWine("A")}
          emptyText={t("compare.selectFirstWine", "Seleccioná el primer vino")}
        />
        <SelectedWineCard
          slot="B"
          label={t("compare.wineB", "Vino B")}
          wine={wineB}
          selected={!!resolvedWineBId}
          active={selectingFor === "B" && !resolvedWineBId}
          onSelect={() => setSelectingFor("B")}
          onClear={() => clearSelectedWine("B")}
          emptyText={t("compare.selectSecondWine", "Seleccioná el segundo vino")}
          disabled={!resolvedWineAId && !resolvedWineBId}
        />
      </View>

      {showWineSearch && (
        <Card radius={radii["2xl"]} style={styles.searchCard}>
          <Text style={styles.searchLabel}>
            {selectingFor === "A"
              ? t("compare.searchWineA", "Buscar vino A")
              : t("compare.searchWineB", "Buscar vino B")}
          </Text>
          <SearchField
            value={search}
            onChangeText={setSearch}
            onClear={() => setSearch("")}
            placeholder={t("wines.searchPlaceholder")}
          />
          {isSearching && debouncedSearch.length >= 2 && <Spinner />}
          <View style={styles.results}>
            {searchResults.map((wineItem) => (
              <Pressable
                key={wineItem.id}
                onPress={() => selectWine(wineItem)}
                style={styles.resultRow}
              >
                <WineImage
                  uri={wineItem.imageUrl ?? wineItem.bottleImageUrl} wineType={wineItem.type}
                  alt={wineItem.name}
                  style={styles.resultImage}
                  containerStyle={styles.resultImage}
                  contentFit="contain"
                />
                <View style={styles.resultInfo}>
                  <Text numberOfLines={1} style={styles.resultName}>
                    {wineItem.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.resultMeta}>
                    {wineItem.winery}
                    {wineItem.region ? ` · ${wineItem.region}` : ""}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Card>
      )}

      {hasBothWines && !(isComparisonError && isCurrentComparison) && (
        <View style={styles.compareAction}>
          {!hasDistinctWines && (
            <Text style={styles.compareHint}>
              {t("compare.sameWine", "Elegí dos vinos diferentes para compararlos.")}
            </Text>
          )}
          <Button
            leftIcon={<GitCompareArrows size={17} color={vinnotColors.white} />}
            disabled={!canCompare}
            loading={(isComparing || comparisonJourneyVisible) && isCurrentComparison}
            onPress={compareSelectedWines}
          >
            {t("compare.action", "Comparar")}
          </Button>
        </View>
      )}

      {(isComparing || comparisonJourneyVisible) && isCurrentComparison && (
        <View testID="comparison-journey" onLayout={({ nativeEvent }) => {
          if (!shouldScrollToJourney.current) return;
          shouldScrollToJourney.current = false;
          scrollRef.current?.scrollTo({ y: Math.max(0, nativeEvent.layout.y - insets.top - 12), animated: true });
        }}>
          <CompareLoadingSteps firstType={wineA?.type} secondType={wineB?.type} />
        </View>
      )}

      {isComparisonError &&
        !isComparing &&
        !comparisonJourneyVisible &&
        isCurrentComparison && (
          <WineComparisonErrorState error={comparisonError} onRetry={compareSelectedWines} />
        )}

      {!isComparing && !comparisonJourneyVisible && isCurrentComparison && comparison && (
        <View style={styles.comparisonStack}>
          {comparison.fromCache && (
            <Badge label={t("compare.cached", "Resultado en cache")} variant="info" />
          )}

          <ComparisonResults
            comparison={comparison}
            wineAName={wineA?.name ?? t("compare.wineA", "Vino A")}
            wineBName={wineB?.name ?? t("compare.wineB", "Vino B")}
          />
        </View>
      )}
    </KeyboardAwareScrollView>
  );
}

function SelectedWineCard({
  slot,
  label,
  wine,
  selected,
  active,
  disabled,
  emptyText,
  onSelect,
  onClear,
}: {
  slot: "A" | "B";
  label: string;
  wine?: Wine;
  selected: boolean;
  active: boolean;
  disabled?: boolean;
  emptyText: string;
  onSelect: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.selectedCard,
        active && styles.selectedCardActive,
        disabled && styles.selectedCardDisabled,
      ]}
    >
      <View style={styles.selectedCardHeader}>
        <Text style={styles.selectedLabel}>{label}</Text>
        {selected && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("compare.removeWine", { label })}
            hitSlop={8}
            onPress={onClear}
            style={styles.removeWineButton}
            testID={`remove-wine-${slot}`}
          >
            <X size={15} color={vinnotColors.muted} strokeWidth={iconStrokes.regular} />
          </Pressable>
        )}
      </View>
      {wine ? (
        <View style={styles.selectedBody}>
          <WineImage
            uri={wine.imageUrl ?? wine.bottleImageUrl} wineType={wine.type}
            alt={wine.name}
            style={styles.selectedImage}
            containerStyle={styles.selectedImage}
            contentFit="contain"
          />
          <View style={styles.selectedInfo}>
            <Text numberOfLines={2} style={styles.selectedName}>
              {wine.name}
            </Text>
            <Text numberOfLines={1} style={styles.selectedMeta}>
              {wine.winery}
            </Text>
            {!!wine.rating && <RatingGlasses rating={wine.rating} wineType={wine.type} max={1} size={24} showLabel />}
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onSelect}
          style={styles.emptySelectionButton}
        >
          <Text style={styles.selectedEmpty}>{emptyText}</Text>
        </Pressable>
      )}
    </View>
  );
}
