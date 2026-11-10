import { useSingleAction } from "@/presentation/hooks/useSingleAction";
import { ADMIN_ROUTE, goBackOr } from "@/presentation/navigation/discoveryNavigation";
import { useAdminDetailEditor } from "@/presentation/hooks/queries/admin/useAdminDetailEditor";
import { AdminQueryError } from "@/presentation/features/admin/AdminQueryError";
import { useToast } from "@/presentation/providers/ToastProvider";
/**
 * Admin — Gestionar rutas (full CRUD, pagination).
 * Matches web AdminRoutesPage.
 */
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Edit3, MapPin, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/presentation/components/layout";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import {
  AdminPageHero,
  AdminPaginationBar,
  AdminSearchBar,
  AdminRouteSheet,
} from "@/presentation/features/admin";
import { useAdminRoutes, useAdminRouteMutations } from "@/presentation/hooks/queries/admin";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useDebounce } from "@/presentation/hooks/ui";
import { ROLES } from "@/shared/config/roles";
import { editorial, lightTokens, layout, radii, systemColors, wine } from "@/shared/theme/tokens";
import { textStyles, fontFamilies } from "@/shared/theme/typography";
import type { AdminRoute } from "@/domain/admin/admin.types";

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<string, { labelKey: string; color: string; bg: string }> = {
  active: {
    labelKey: "admin.routes.statusLabels.active",
    color: systemColors.successText,
    bg: systemColors.successLight,
  },
  draft: {
    labelKey: "admin.routes.statusLabels.draft",
    color: lightTokens.textSecondary,
    bg: lightTokens.bgSubtle,
  },
  archived: { labelKey: "admin.routes.statusLabels.archived", color: wine[800], bg: wine[50] },
  PUBLISHED: {
    labelKey: "admin.routes.statusLabels.active",
    color: systemColors.successText,
    bg: systemColors.successLight,
  },
  DRAFT: {
    labelKey: "admin.routes.statusLabels.draft",
    color: lightTokens.textSecondary,
    bg: lightTokens.bgSubtle,
  },
  ARCHIVED: { labelKey: "admin.routes.statusLabels.archived", color: wine[800], bg: wine[50] },
};

function RouteRow({
  item,
  canDelete,
  onEdit,
  onDelete,
}: {
  item: AdminRoute;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const badge =
    STATUS_STYLES[item.status] ?? STATUS_STYLES[item.status.toUpperCase()] ?? STATUS_STYLES.draft!;
  const meta = [
    item.region ?? item.country,
    item.difficulty
      ? t(`admin.routes.difficulty.${item.difficulty.toLowerCase()}`, {
          defaultValue: item.difficulty,
        })
      : null,
    item.estimatedDays ? t("admin.routes.daysCount", { count: item.estimatedDays }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={rowStyles.card}>
      <View style={rowStyles.body}>
        <View style={rowStyles.topRow}>
          <Text numberOfLines={1} style={rowStyles.name}>
            {item.name}
          </Text>
          <View style={[rowStyles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[rowStyles.badgeText, { color: badge.color }]}>{t(badge.labelKey)}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={rowStyles.country}>
          {item.country}
        </Text>
        {!!meta && <Text style={rowStyles.meta}>{meta}</Text>}
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
  name: { flex: 1, ...textStyles.titleSmall, color: lightTokens.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  badgeText: { ...textStyles.caption, fontFamily: fontFamilies.semibold },
  country: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  meta: { ...textStyles.caption, color: lightTokens.textDisabled },
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
    backgroundColor: systemColors.dangerLight,
  },
});

export function AdminRoutesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const {
    editing: editingRoute,
    visible: sheetVisible,
    openCreate,
    openEdit,
    close: closeEditor,
    isLoading: loadingDetail,
  } = useAdminDetailEditor<AdminRoute>("route");
  const { showError, showSuccess } = useToast();
  const deletion = useSingleAction();
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useAdminRoutes(
    page,
    PAGE_SIZE,
    debouncedSearch || undefined,
  );
  const { remove } = useAdminRouteMutations();
  const canDelete = hasRole(ROLES.ADMIN);
  const items: AdminRoute[] = data?.items ?? [];
  const totalPages = Math.ceil((data?.totalItems ?? 0) / PAGE_SIZE);

  const confirmDelete = (item: AdminRoute) => {
    if (deletion.pending) return;
    Alert.alert(t("admin.routes.deleteTitle"), t("admin.routes.deleteMessage"), [
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
        <AppHeader title={t("admin.actions.manageRoutes")} showBack onBack={() => goBackOr(router, ADMIN_ROUTE)} />

        <FlashList<AdminRoute>
          data={isLoading ? [] : items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RouteRow
              item={item}
              canDelete={canDelete && !deletion.pending}
              onEdit={() => openEdit(item)}
              onDelete={() => confirmDelete(item)}
            />
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              {loadingDetail && <Skeleton height={36} />}
              <AdminPageHero
                title={t("admin.routes.title")}
                subtitle={t("admin.routes.subtitle")}
                section="routes"
                onNew={openCreate}
                newLabel={t("admin.routes.newRoute")}
              />
              <AdminSearchBar
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  setPage(0);
                }}
                placeholder={t("admin.routes.searchPlaceholder")}
                resultCount={isLoading ? undefined : data?.totalItems}
              />
              {isLoading && (
                <View style={styles.skeletons}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} height={74} radius={radii["2xl"]} />
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
              countKey="admin.routes.count"
              onPageChange={setPage}
            />
          }
          ListEmptyComponent={
            isError ? (
              <AdminQueryError retry={refetch} />
            ) : !isLoading ? (
              <EmptyState
                title={t("common.noResults")}
                description={t("admin.routes.noRoutes")}
                icon={<MapPin size={34} color={editorial.brand} />}
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

        <AdminRouteSheet visible={sheetVisible} editingRoute={editingRoute} onClose={closeEditor} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { gap: 14, paddingTop: 16, paddingBottom: 8 },
  skeletons: { gap: 10 },
  separator: { height: 10 },
});
