import { useSingleAction } from "@/presentation/hooks/useSingleAction";
import { ADMIN_ROUTE, goBackOr } from "@/presentation/navigation/discoveryNavigation";
import { useAdminDetailEditor } from "@/presentation/hooks/queries/admin/useAdminDetailEditor";
import { AdminQueryError } from "@/presentation/features/admin/AdminQueryError";
import { useToast } from "@/presentation/providers/ToastProvider";
/**
 * Admin — Gestionar vinos (full CRUD, pagination, rich rows).
 * Matches web AdminWinesPage.
 */
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { ClipboardList, Edit3, Star, Trash2, Wine } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/presentation/components/layout";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { WineImage } from "@/presentation/features/wine/WineImage";
import {
  AdminPageHero,
  AdminPaginationBar,
  AdminSearchBar,
  AdminWineSheet,
} from "@/presentation/features/admin";
import { useAdminWines, useAdminWineMutations } from "@/presentation/hooks/queries/admin";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useDebounce } from "@/presentation/hooks/ui";
import { ROLES } from "@/shared/config/roles";
import { editorial, lightTokens, layout, radii, systemColors, wine, wineTypeColor } from "@/shared/theme/tokens";
import { fontFamilies, textStyles } from "@/shared/theme/typography";
import type { AdminWine } from "@/domain/admin/admin.types";

const PAGE_SIZE = 20;

function WineRow({
  item,
  canDelete,
  onEdit,
  onDelete,
  onOpenAiProfile,
}: {
  item: AdminWine;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenAiProfile: () => void;
}) {
  const { t } = useTranslation();
  const badge = wineTypeColor(item.wineType);
  return (
    <View style={rowStyles.card}>
      <View style={rowStyles.imageBox}>
        <WineImage
          uri={item.imageUrl}
          wineType={item.wineType}
          alt={item.name}
          style={rowStyles.image}
          containerStyle={rowStyles.image}
          contentFit="contain"
        />
      </View>
      <View style={rowStyles.body}>
        <View style={rowStyles.topRow}>
          <View style={rowStyles.nameRow}>
            <Text numberOfLines={2} style={rowStyles.name}>
              {item.name}
              {item.vintage ? ` ${item.vintage}` : ""}
            </Text>
            {item.isFeatured && <Star size={13} color={editorial.brand} fill={editorial.brand} />}
          </View>
          <View style={[rowStyles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[rowStyles.badgeText, { color: badge.text }]}>
              {t(`wines.types.${item.wineType}`, { defaultValue: item.wineType })}
            </Text>
          </View>
        </View>
        <Text numberOfLines={1} style={rowStyles.sub}>
          {item.wineryName}
        </Text>
        <View style={rowStyles.metaRow}>
          {item.ratingAverage != null && (
            <View style={rowStyles.ratingRow}>
              <Star size={12} color={systemColors.warning} fill={systemColors.warning} />
              <Text style={rowStyles.ratingText}>{Number(item.ratingAverage).toFixed(1)}</Text>
            </View>
          )}
          <View
            style={[
              rowStyles.statusDot,
              {
                backgroundColor: item.isActive ? systemColors.success : systemColors.danger,
              },
            ]}
          />
          <Text style={rowStyles.statusText}>
            {t(item.isActive ? "admin.wines.active" : "admin.wines.inactive")}
          </Text>
        </View>
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
        <Pressable
          onPress={onOpenAiProfile}
          hitSlop={6}
          style={rowStyles.aiBtn}
          accessibilityRole="button"
          accessibilityLabel={t("admin.common.aiProfileItem", { name: item.name })}
        >
          <ClipboardList size={15} color={editorial.brand} />
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
    gap: 10,
    backgroundColor: lightTokens.surfaceDefault,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    overflow: "hidden",
  },
  imageBox: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    backgroundColor: lightTokens.bgSubtle,
  },
  image: { width: 44, height: 60 },
  body: { flex: 1, gap: 3, paddingVertical: 10 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  nameRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  name: { flex: 1, ...textStyles.titleSmall, color: lightTokens.textPrimary },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.full, borderWidth: 1 },
  badgeText: { ...textStyles.caption, fontFamily: fontFamilies.semibold },
  sub: { ...textStyles.caption, color: lightTokens.textTertiary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { ...textStyles.caption, color: lightTokens.textSecondary },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { ...textStyles.caption, color: lightTokens.textTertiary },
  // 32pt icons + 6pt hit slop = 44pt targets; the gap keeps neighbouring targets apart.
  actions: { flexDirection: "column", gap: 12, paddingRight: 12 },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: wine[50],
  },
  aiBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: wine[50],
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: systemColors.dangerLight,
  },
});

export function AdminWinesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const {
    editing: editingWine,
    visible: sheetVisible,
    openCreate,
    openEdit,
    close: closeEditor,
    isLoading: loadingDetail,
  } = useAdminDetailEditor<AdminWine>("wine");
  const { showError, showSuccess } = useToast();
  const deletion = useSingleAction();
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useAdminWines(
    page,
    PAGE_SIZE,
    debouncedSearch || undefined,
  );
  const { remove } = useAdminWineMutations();
  const canDelete = hasRole(ROLES.ADMIN);

  const items: AdminWine[] = data?.items ?? [];
  const totalPages = Math.ceil((data?.totalItems ?? 0) / PAGE_SIZE);

  const confirmDelete = (item: AdminWine) => {
    if (deletion.pending) return;
    Alert.alert(t("admin.wines.deleteTitle"), t("admin.wines.deleteMessage"), [
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

  // The profile editor shows the existing profile, or offers to generate one when the wine has none.
  const openAiProfile = (wineId: string) =>
    router.push({ pathname: "/(app)/admin/wines/[id]/ai-profile", params: { id: wineId } });

  return (
    <>
      <View style={{ flex: 1, backgroundColor: lightTokens.bgBase }}>
        <AppHeader title={t("admin.actions.manageWines")} showBack onBack={() => goBackOr(router, ADMIN_ROUTE)} />

        <FlashList<AdminWine>
          data={isLoading ? [] : items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WineRow
              item={item}
              canDelete={canDelete && !deletion.pending}
              onEdit={() => openEdit(item)}
              onDelete={() => confirmDelete(item)}
              onOpenAiProfile={() => openAiProfile(item.id)}
            />
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              {loadingDetail && <Skeleton height={36} />}
              <AdminPageHero
                title={t("admin.wines.title")}
                subtitle={t("admin.wines.subtitle")}
                section="wines"
                onNew={openCreate}
                newLabel={t("admin.wines.newWine")}
              />
              <AdminSearchBar
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  setPage(0);
                }}
                placeholder={t("admin.wines.searchPlaceholder")}
                resultCount={isLoading ? undefined : data?.totalItems}
              />
              {isLoading && (
                <View style={styles.skeletons}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} height={88} radius={radii["2xl"]} />
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
              countKey="admin.wines.count"
              onPageChange={setPage}
            />
          }
          ListEmptyComponent={
            isError ? (
              <AdminQueryError retry={refetch} />
            ) : !isLoading ? (
              <EmptyState
                title={t("common.noResults")}
                description={t("admin.wines.noWines")}
                icon={<Wine size={34} color={wine[700]} />}
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

        <AdminWineSheet
          visible={sheetVisible}
          editingWine={editingWine}
          onClose={closeEditor}
          onOpenAiProfile={(wineId) => {
            closeEditor();
            openAiProfile(wineId);
          }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { gap: 14, paddingTop: 16, paddingBottom: 8 },
  skeletons: { gap: 10 },
  separator: { height: 10 },
});
