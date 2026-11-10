/**
 * Cellar Screen — personal wine collection.
 */
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { IllustratedState } from "@/presentation/components/ui/IllustratedState";
import { Button } from "@/presentation/components/ui/Button";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { SearchFilterBar } from "@/presentation/components/ui/SearchFilterBar";
import {
  CellarAddSheet,
  CellarEntryRow,
  CellarFilterSheet,
  CellarStatsBanner,
  type CellarSegment,
} from "@/presentation/features/cellar";
import { useCellar, useRemoveCellarEntry } from "@/presentation/hooks/queries/cellar";
import { useDebounce } from "@/presentation/hooks/ui";
import { AuthGuard } from "@/presentation/navigation/guards";
import { AppHeader } from "@/presentation/components/layout";
import { CELLAR_ROUTE, exitCellar } from "@/presentation/navigation/discoveryNavigation";
import { createWineDetailRoute, createWineReviewRoute } from "@/presentation/navigation/wineNavigation";
import { useToast } from "@/presentation/providers/ToastProvider";
import { shadows } from "@/shared/theme/shadows";
import { layout, radii, iconStrokes } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import type { CellarEntry } from "@/domain/cellar/cellar.types";
import { CellarReviewSheet } from "./CellarReviewSheet";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { fontSizes } from "@/shared/theme/typography";

function CellarScreenContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const cellarQuery = useCellar();
  const removeMutation = useRemoveCellarEntry();
  const [segment, setSegment] = useState<CellarSegment>("all");
  const [search, setSearch] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CellarEntry | null>(null);
  const [publishingEntry, setPublishingEntry] = useState<CellarEntry | null>(null);
  const debouncedSearch = useDebounce(search.trim().toLowerCase(), 250);
  const entries = useMemo(() => cellarQuery.data ?? [], [cellarQuery.data]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSegment =
        segment === "all" ||
        (segment === "rated" && !!entry.rating) ||
        (segment === "notes" && !!entry.notes);
      const haystack = [
        entry.wine.name,
        entry.wine.winery,
        entry.wine.region,
        entry.wine.country,
        entry.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesSegment && (!debouncedSearch || haystack.includes(debouncedSearch));
    });
  }, [debouncedSearch, entries, segment]);

  const openAddSheet = () => {
    setEditingEntry(null);
    setSheetVisible(true);
  };

  const openEditSheet = (entry: CellarEntry) => {
    setEditingEntry(entry);
    setSheetVisible(true);
  };

  const handleDelete = (entry: CellarEntry) => {
    Alert.alert(t("cellar.confirmDelete"), t("cellar.confirmDeleteDesc"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          removeMutation.mutate(entry.id, {
            onSuccess: () => showSuccess(t("cellar.deleteSuccess")),
            onError: () => showError(t("cellar.deleteError")),
          });
        },
      },
    ]);
  };

  const header = (
    <View style={styles.headerWrap}>
      <CellarStatsBanner entries={entries} onAddPress={openAddSheet} />
      <SearchFilterBar
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch("")}
        placeholder={t("cellar.searchPlaceholder")}
        activeFilterCount={segment === "all" ? 0 : 1}
        onFilterPress={() => setFilterVisible(true)}
        isLoading={cellarQuery.isFetching && !cellarQuery.isLoading}
        filterAccessibilityLabel={t("common.filters", { defaultValue: "Abrir filtros" })}
        clearAccessibilityLabel={t("common.clear", { defaultValue: "Limpiar búsqueda" })}
      />
      {segment !== "all" && (
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel={t("common.clear", { defaultValue: "Quitar filtro" })}
          onPress={() => setSegment("all")}
          style={styles.activeFilter}
        >
          <Text style={styles.activeFilterText}>{t(`cellar.segments.${segment}`)}</Text>
          <X size={14} color={vinnotColors.brandDeep} strokeWidth={iconStrokes.strong} />
        </MotionPressable>
      )}
      <View style={styles.listHeader}>
        <View>
          <Text style={styles.sectionTitle}>{t("cellar.collection")}</Text>
          <Text style={styles.resultCount}>
            {t("cellar.winesInCellarCount", { count: filteredEntries.length })}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
      <View style={styles.screen}>
        <AppHeader title={t("navigation.cellar")} showBack onBack={() => exitCellar(router)} />
        {cellarQuery.isLoading ? (
          <View style={[styles.loadingContent, { paddingBottom: 24 }]}>
            {header}
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} height={164} radius={radii["2xl"]} />
            ))}
          </View>
        ) : (
          <FlashList<CellarEntry>
            data={filteredEntries}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CellarEntryRow
                entry={item}
                onPress={() => router.push(createWineDetailRoute(item.wine.id, CELLAR_ROUTE))}
                onEdit={() => openEditSheet(item)}
                onPublishReview={() => {
                  if (item.reviewId) router.push(createWineReviewRoute(item.wine.id, CELLAR_ROUTE));
                  else setPublishingEntry(item);
                }}
                onDelete={() => handleDelete(item)}
              />
            )}
            ListHeaderComponent={
              <>
                {header}
                {cellarQuery.isError && (
                  <QueryErrorState
                    error={cellarQuery.error}
                    onRetry={() => void cellarQuery.refetch()}
                  />
                )}
              </>
            }
            ListEmptyComponent={
              cellarQuery.isError ? null : entries.length === 0 ? (
                <IllustratedState kind="emptyCellar" compact>
                  <Button onPress={openAddSheet}>{t("cellar.addWine")}</Button>
                </IllustratedState>
              ) : (
                <EmptyState
                  illustration="noWines"
                  title={t("common.noResults")}
                  description={t("cellar.noResultsDesc")}
                  action={{ label: t("cellar.addWine"), onPress: openAddSheet }}
                />
              )
            }
            contentContainerStyle={{
              paddingHorizontal: layout.screenHorizontalPadding,
              // Room for the floating add button above the last row.
              paddingBottom: 96 + insets.bottom,
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <BrandRefreshControl
                refreshing={cellarQuery.isFetching}
                onRefresh={() => {
                  void cellarQuery.refetch();
                }}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* An empty cellar already offers Add in the banner and the welcome state. */}
        {entries.length > 0 ? (
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel={t("cellar.addWine")}
            onPress={openAddSheet}
            style={[styles.fab, { bottom: 18 + insets.bottom }]}
          >
            <Plus size={24} color={vinnotColors.white} strokeWidth={iconStrokes.strong} />
          </MotionPressable>
        ) : null}

        <CellarFilterSheet
          visible={filterVisible}
          value={segment}
          onChange={setSegment}
          onClose={() => setFilterVisible(false)}
        />

        <CellarAddSheet
          visible={sheetVisible}
          entry={editingEntry}
          onClose={() => setSheetVisible(false)}
        />
        {publishingEntry && <CellarReviewSheet key={publishingEntry.id} entry={publishingEntry}
          onClose={() => setPublishingEntry(null)}
          onOpenWine={() => {
            setPublishingEntry(null);
            router.push(createWineReviewRoute(publishingEntry.wine.id, CELLAR_ROUTE));
          }} />}
      </View>
    </>
  );
}

export default function CellarScreen() {
  return (
    <AuthGuard>
      <CellarScreenContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: vinnotColors.canvas },
  headerWrap: { gap: 14, marginBottom: 18 },
  activeFilter: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 34,
    borderWidth: 1,
    borderColor: vinnotColors.brandSoftStrong,
    borderRadius: radii.xl,
    paddingHorizontal: 12,
    backgroundColor: vinnotColors.brandSoft,
  },
  activeFilterText: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.sm,
    color: vinnotColors.brandDeep,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.xl,
    color: vinnotColors.ink,
  },
  resultCount: {
    marginTop: 2,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    color: vinnotColors.muted,
  },
  loadingContent: {
    gap: 16,
    paddingHorizontal: layout.screenHorizontalPadding,
  },
  separator: { height: 14 },
  fab: {
    position: "absolute",
    right: 22,
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    backgroundColor: vinnotColors.brand,
    borderWidth: 3,
    borderColor: vinnotColors.white,
    ...shadows.lg,
  },
});
