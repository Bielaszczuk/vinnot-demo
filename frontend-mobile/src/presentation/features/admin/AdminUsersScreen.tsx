import { AdminQueryError } from "@/presentation/features/admin/AdminQueryError";
import { ADMIN_ROUTE, goBackOr } from "@/presentation/navigation/discoveryNavigation";
/**
 * Admin — Gestionar usuarios (role picker, ban/unban, delete, pagination).
 * Matches web AdminUsersPage.
 */
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Users } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/presentation/components/layout";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { AdminUserRow } from "@/presentation/features/admin/AdminUserRow";
import {
  AdminPageHero,
  AdminPaginationBar,
  AdminSearchBar,
  AdminUserActionSheet,
} from "@/presentation/features/admin";
import { useAdminUsers } from "@/presentation/hooks/queries/admin";
import { useDebounce } from "@/presentation/hooks/ui";
import { ROLES } from "@/shared/config/roles";
import { RoleGuard } from "@/presentation/navigation/guards";
import { editorial, lightTokens, layout, radii } from "@/shared/theme/tokens";
import type { AdminUser } from "@/domain/admin/admin.types";

const PAGE_SIZE = 20;

function AdminUsersScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [actionSheetUser, setActionSheetUser] = useState<AdminUser | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useAdminUsers(
    page,
    PAGE_SIZE,
    debouncedSearch || undefined,
  );
  const items: AdminUser[] = data?.items ?? [];
  const totalPages = Math.ceil((data?.totalItems ?? 0) / PAGE_SIZE);

  return (
    <>
      <View style={{ flex: 1, backgroundColor: lightTokens.bgBase }}>
        <AppHeader title={t("admin.actions.manageUsers")} showBack onBack={() => goBackOr(router, ADMIN_ROUTE)} />

        <FlashList<AdminUser>
          data={isLoading ? [] : items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AdminUserRow
              user={item}
              onPress={() => {
                setActionSheetUser(item);
                setSheetVisible(true);
              }}
            />
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              <AdminPageHero
                title={t("admin.users.title")}
                subtitle={t("admin.users.subtitle")}
                section="users"
              />
              <AdminSearchBar
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  setPage(0);
                }}
                placeholder={t("admin.users.searchPlaceholder")}
                resultCount={isLoading ? undefined : data?.totalItems}
              />
              {isLoading && (
                <View style={styles.skeletons}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} height={76} radius={radii["2xl"]} />
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
              countKey="admin.users.count"
              onPageChange={setPage}
            />
          }
          ListEmptyComponent={
            isError ? (
              <AdminQueryError retry={refetch} />
            ) : !isLoading ? (
              <EmptyState
                title={t("common.noResults")}
                description={t("admin.users.noUsers")}
                icon={<Users size={34} color={editorial.brand} />}
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

        <AdminUserActionSheet
          visible={sheetVisible}
          user={actionSheetUser}
          onClose={() => {
            setSheetVisible(false);
            setActionSheetUser(null);
          }}
        />
      </View>
    </>
  );
}

export function AdminUsersScreen() {
  return (
    <RoleGuard requiredRoles={[ROLES.ADMIN]}>
      <AdminUsersScreenContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  header: { gap: 14, paddingTop: 16, paddingBottom: 8 },
  skeletons: { gap: 10 },
  separator: { height: 10 },
});
