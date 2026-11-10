import { useSingleAction } from "@/presentation/hooks/useSingleAction";
import { ADMIN_ROUTE, goBackOr } from "@/presentation/navigation/discoveryNavigation";
import { useAdminDetailEditor } from "@/presentation/hooks/queries/admin/useAdminDetailEditor";
import { AdminQueryError } from "@/presentation/features/admin/AdminQueryError";
import { AdminFilterPicker } from "@/presentation/features/admin/forms/AdminFilterPicker";
import { useToast } from "@/presentation/providers/ToastProvider";
/**
 * Admin — Gestionar bodegas (full CRUD, pagination, rich rows).
 * Matches web AdminWineriesPage.
 */
import { useState } from "react";
import { useAuth } from "@/presentation/hooks/useAuth";
import { ROLES } from "@/shared/config/roles";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { BookOpen, Edit3, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/presentation/components/layout";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import {
  AdminPageHero,
  AdminPaginationBar,
  AdminSearchBar,
  AdminWinerySheet,
} from "@/presentation/features/admin";
import {
  useAdminCountries,
  useAdminRegions,
  useAdminWineries,
  useAdminWineryMutations,
} from "@/presentation/hooks/queries/admin";
import { useDebounce } from "@/presentation/hooks/ui";
import { editorial, lightTokens, layout, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import type { AdminWinery } from "@/domain/admin/admin.types";

const PAGE_SIZE = 20;

function WineryRow({
  item,
  onEdit,
  onDelete,
  canDelete,
}: {
  item: AdminWinery;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { t } = useTranslation();

  return (
    <View style={rowStyles.card}>
      <View style={rowStyles.body}>
        <View style={rowStyles.topRow}>
          <Text numberOfLines={1} style={rowStyles.name}>
            {item.name}
          </Text>
          {item.establishedYear && (
            <View style={rowStyles.yearBadge}>
              <Text style={rowStyles.yearText}>
                {t("wineries.established")} {item.establishedYear}
              </Text>
            </View>
          )}
        </View>
        <Text numberOfLines={1} style={rowStyles.location}>
          {[item.regionName, item.countryName].filter(Boolean).join(", ")}
        </Text>
        <Text style={rowStyles.winesCount}>
          {t("admin.wineries.winesCount", { count: item.winesCount })}
        </Text>
      </View>
      <View style={rowStyles.actions}>
        <Pressable
          onPress={onEdit}
          hitSlop={6}
          style={rowStyles.editBtn}
          accessibilityRole="button"
          accessibilityLabel={t("admin.common.editItem", { name: item.name })}
        >
          <Edit3 size={15} color={editorial.brand} />
        </Pressable>
        {canDelete && (
          <Pressable
            onPress={onDelete}
            hitSlop={6}
            style={rowStyles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel={t("admin.common.deleteItem", { name: item.name })}
          >
            <Trash2 size={15} color={lightTokens.danger} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: lightTokens.surfaceDefault,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  body: { flex: 1, gap: 3 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, ...textStyles.titleMedium, color: lightTokens.textPrimary },
  yearBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    backgroundColor: wine[50],
  },
  yearText: { ...textStyles.caption, color: editorial.brand },
  location: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  winesCount: { ...textStyles.caption, color: lightTokens.textDisabled },
  // 32pt icons + 6pt hit slop = 44pt targets; the gap keeps neighbouring targets apart.
  actions: { flexDirection: "column", gap: 12 },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: wine[50],
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightTokens.dangerLight,
  },
});

export function AdminWineriesScreen() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const canDelete = hasRole(ROLES.ADMIN);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [countryId, setCountryId] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);
  const {
    editing: editingWinery,
    visible: sheetVisible,
    openCreate,
    openEdit,
    close: closeEditor,
    isLoading: loadingDetail,
  } = useAdminDetailEditor<AdminWinery>("winery");
  const { showError, showSuccess } = useToast();
  const deletion = useSingleAction();
  const debouncedSearch = useDebounce(search, 350);
  const { data: countries = [] } = useAdminCountries();
  const { data: regions = [] } = useAdminRegions(countryId ?? undefined);
  const selectedCountryName = countries.find((country) => country.id === countryId)?.name;
  const selectedRegionName = regions.find((region) => region.id === regionId)?.name;

  const { data, isLoading, isError, refetch } = useAdminWineries(
    page,
    PAGE_SIZE,
    debouncedSearch || undefined,
    selectedCountryName,
    selectedRegionName,
  );
  const { remove } = useAdminWineryMutations();

  const items: AdminWinery[] = data?.items ?? [];
  const totalPages = Math.ceil((data?.totalItems ?? 0) / PAGE_SIZE);

  const confirmDelete = (item: AdminWinery) => {
    if (deletion.pending) return;
    Alert.alert(t("admin.wineries.deleteTitle"), t("admin.wineries.deleteMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () =>
          void deletion.run(
            () => remove.mutateAsync(item.id),
            () => showSuccess(t("admin.feedback.deleteSuccess")),
            () => showError(t("admin.feedback.deleteError")),
          ),
      },
    ]);
  };

  return (
    <>
      <View style={{ flex: 1, backgroundColor: lightTokens.bgBase }}>
        <AppHeader
          title={t("admin.actions.manageWineries")}
          showBack
          onBack={() => goBackOr(router, ADMIN_ROUTE)}
        />

        <FlashList<AdminWinery>
          data={isLoading ? [] : items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WineryRow
              item={item}
              onEdit={() => openEdit(item)}
              canDelete={canDelete && !deletion.pending}
              onDelete={() => confirmDelete(item)}
            />
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              {loadingDetail && <Skeleton height={36} />}
              <AdminPageHero
                title={t("admin.wineries.title")}
                subtitle={t("admin.wineries.subtitle")}
                section="wineries"
                onNew={openCreate}
                newLabel={t("admin.wineries.newWinery")}
              />
              <AdminSearchBar
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  setPage(0);
                }}
                placeholder={t("admin.wineries.searchPlaceholder")}
                resultCount={isLoading ? undefined : data?.totalItems}
              />
              <View style={styles.filters}>
                <AdminFilterPicker
                  label={t("admin.wineries.country")}
                  value={countryId}
                  options={countries}
                  allLabel={t("admin.wineries.allCountries")}
                  searchPlaceholder={t("admin.wineries.countrySearch")}
                  onSelect={(id) => {
                    setCountryId(id);
                    setRegionId(null);
                    setPage(0);
                  }}
                />
                <AdminFilterPicker
                  label={t("admin.wineries.region")}
                  value={regionId}
                  options={regions}
                  allLabel={t("admin.wineries.allRegions")}
                  searchPlaceholder={t("admin.wineries.regionSearch")}
                  disabled={!countryId}
                  onSelect={(id) => {
                    setRegionId(id);
                    setPage(0);
                  }}
                />
              </View>
              {isLoading && (
                <View style={styles.skeletons}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} height={78} radius={radii["2xl"]} />
                  ))}
                </View>
              )}
            </View>
          }
          ListFooterComponent={
            <AdminPaginationBar
              page={page}
              totalPages={totalPages}
              totalItems={data?.totalItems ?? 0}
              countKey="admin.wineries.count"
              onPageChange={setPage}
            />
          }
          ListEmptyComponent={
            isError ? (
              <AdminQueryError retry={refetch} />
            ) : !isLoading ? (
              <EmptyState
                title={t("common.noResults")}
                description={t("admin.wineries.noWineries")}
                icon={<BookOpen size={34} color={editorial.brand} />}
              />
            ) : null
          }
          contentContainerStyle={{
            paddingHorizontal: layout.screenHorizontalPadding,
            paddingBottom: insets.bottom + 24,
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />

        <AdminWinerySheet
          visible={sheetVisible}
          editingWinery={editingWinery}
          onClose={closeEditor}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { gap: 14, paddingTop: 16, paddingBottom: 8 },
  filters: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  skeletons: { gap: 10 },
  separator: { height: 10 },
});
