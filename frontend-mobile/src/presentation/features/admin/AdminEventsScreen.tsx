import { useAdminDetailEditor } from "@/presentation/hooks/queries/admin/useAdminDetailEditor";
import { ADMIN_ROUTE, goBackOr } from "@/presentation/navigation/discoveryNavigation";
import { AdminQueryError } from "@/presentation/features/admin/AdminQueryError";
import { useToast } from "@/presentation/providers/ToastProvider";
/**
 * Admin — Gestionar eventos (full CRUD, pagination).
 * Matches web AdminEventsPage.
 */
import { useState } from "react";
import { useAuth } from "@/presentation/hooks/useAuth";
import { ROLES } from "@/shared/config/roles";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { CalendarDays, CalendarX, ClipboardList, Edit3 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/presentation/components/layout";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import {
  AdminPageHero,
  AdminPaginationBar,
  AdminSearchBar,
  AdminEventSheet,
} from "@/presentation/features/admin";
import {
  CancelEventSheet,
  EventRegistrationsManagerSheet,
  useEventCancellation,
} from "@/presentation/features/event";
import { useAdminEvents, useAdminEventMutations } from "@/presentation/hooks/queries/admin";
import { useDebounce } from "@/presentation/hooks/ui";
import { adminSectionAccent, editorial, lightTokens, layout, radii, systemColors, wine } from "@/shared/theme/tokens";
import { fontFamilies, textStyles } from "@/shared/theme/typography";
import type { AdminEvent } from "@/domain/admin/admin.types";

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<string, { color: string; bg: string; dot: string }> = {
  PUBLISHED: {
    color: systemColors.successText,
    bg: systemColors.successLight,
    dot: systemColors.success,
  },
  DRAFT: {
    color: lightTokens.textSecondary,
    bg: lightTokens.bgSubtle,
    dot: lightTokens.textDisabled,
  },
  CANCELLED: {
    color: systemColors.dangerText,
    bg: systemColors.dangerLight,
    dot: systemColors.danger,
  },
  COMPLETED: {
    color: systemColors.infoText,
    bg: systemColors.infoLight,
    dot: systemColors.info,
  },
};

function EventRow({
  item,
  onEdit,
  onCancel,
  canCancel,
  onRegistrations,
}: {
  item: AdminEvent;
  onEdit: () => void;
  onCancel: () => void;
  canCancel: boolean;
  onRegistrations: () => void;
}) {
  const { t, i18n } = useTranslation();
  const status = item.status.toUpperCase();
  const badge = (STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT)!;
  const dateStr = new Date(item.startDate).toLocaleDateString(
    i18n.resolvedLanguage ?? i18n.language,
    { day: "2-digit", month: "short", year: "numeric" },
  );

  return (
    <View style={rowStyles.card}>
      <View style={rowStyles.body}>
        <View style={rowStyles.topRow}>
          <Text numberOfLines={1} style={rowStyles.title}>
            {item.title}
          </Text>
          <View style={[rowStyles.badge, { backgroundColor: badge.bg }]}>
            <View style={[rowStyles.dot, { backgroundColor: badge.dot }]} />
            <Text style={[rowStyles.badgeText, { color: badge.color }]}>
              {t(`events.statusLabels.${status.toLowerCase()}`)}
            </Text>
          </View>
        </View>
        <Text numberOfLines={1} style={rowStyles.city}>
          {[item.locationCity, item.locationRegion].filter(Boolean).join(", ")}
        </Text>
        <View style={rowStyles.metaRow}>
          <Text style={rowStyles.date}>{dateStr}</Text>
          <Text style={rowStyles.sep}>·</Text>
          <Text style={rowStyles.attendees}>
            {item.currentAttendees}
            {item.maxAttendees ? `/${item.maxAttendees}` : ""} {t("admin.events.attendeeLabel")}
          </Text>
        </View>
      </View>
      <View style={rowStyles.actions}>
        <Pressable
          onPress={onRegistrations}
          hitSlop={6}
          style={rowStyles.registrationsBtn}
          accessibilityRole="button"
          accessibilityLabel={t("admin.events.manageRegistrationsFor", { title: item.title })}
        >
          <ClipboardList size={15} color={adminSectionAccent.events} />
        </Pressable>
        <Pressable
          onPress={onEdit}
          hitSlop={6}
          style={rowStyles.editBtn}
          accessibilityRole="button"
          accessibilityLabel={t("admin.common.editItem", { name: item.title })}
        >
          <Edit3 size={15} color={editorial.brand} />
        </Pressable>
        {canCancel && (
          <Pressable
            onPress={onCancel}
            hitSlop={6}
            style={rowStyles.cancelBtn}
            accessibilityRole="button"
            accessibilityLabel={t("admin.common.cancelEventItem", { name: item.title })}
          >
            <CalendarX size={15} color={lightTokens.danger} />
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
  title: { flex: 1, ...textStyles.titleSmall, color: lightTokens.textPrimary },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { ...textStyles.caption, fontFamily: fontFamilies.semibold },
  city: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  date: { ...textStyles.caption, color: lightTokens.textSecondary },
  sep: { ...textStyles.caption, color: lightTokens.textDisabled },
  attendees: { ...textStyles.caption, color: lightTokens.textDisabled },
  // 32pt icons + 6pt hit slop = 44pt targets; the gap keeps neighbouring targets apart.
  actions: { flexDirection: "column", gap: 12 },
  registrationsBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: lightTokens.brandSecondary,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: wine[50],
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: systemColors.dangerLight,
  },
});

export function AdminEventsScreen() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const canCancel = hasRole(ROLES.ADMIN);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const {
    editing: editingEvent,
    visible: sheetVisible,
    openCreate,
    openEdit,
    close: closeEditor,
    isLoading: loadingDetail,
  } = useAdminDetailEditor<AdminEvent>("event");
  const { showError, showSuccess } = useToast();
  const [registrationsEvent, setRegistrationsEvent] = useState<AdminEvent | null>(null);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useAdminEvents(
    page,
    PAGE_SIZE,
    debouncedSearch || undefined,
  );
  const { remove } = useAdminEventMutations();
  const items: AdminEvent[] = data?.items ?? [];
  const totalPages = Math.ceil((data?.totalItems ?? 0) / PAGE_SIZE);

  const cancellation = useEventCancellation({
    cancel: (input) => remove.mutateAsync(input),
    onSuccess: () => showSuccess(t("admin.events.toastCancelled")),
    onError: () => showError(t("admin.feedback.deleteError")),
  });

  return (
    <>
      <View style={{ flex: 1, backgroundColor: lightTokens.bgBase }}>
        <AppHeader title={t("admin.actions.manageEvents")} showBack onBack={() => goBackOr(router, ADMIN_ROUTE)} />

        <FlashList<AdminEvent>
          data={isLoading ? [] : items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventRow
              item={item}
              onEdit={() => openEdit(item)}
              canCancel={
                canCancel &&
                !cancellation.pending &&
                !["CANCELLED", "COMPLETED"].includes(item.status.toUpperCase())
              }
              onCancel={() => cancellation.request(item)}
              onRegistrations={() => setRegistrationsEvent(item)}
            />
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              {loadingDetail && <Skeleton height={36} />}
              <AdminPageHero
                title={t("admin.events.title")}
                subtitle={t("admin.events.subtitle")}
                section="events"
                onNew={openCreate}
                newLabel={t("admin.events.newEvent")}
              />
              <AdminSearchBar
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  setPage(0);
                }}
                placeholder={t("admin.events.searchPlaceholder")}
                resultCount={isLoading ? undefined : data?.totalItems}
              />
              {isLoading && (
                <View style={styles.skeletons}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} height={80} radius={radii["2xl"]} />
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
              countKey="admin.events.count"
              onPageChange={setPage}
            />
          }
          ListEmptyComponent={
            isError ? (
              <AdminQueryError retry={refetch} />
            ) : !isLoading ? (
              <EmptyState
                title={t("common.noResults")}
                description={t("admin.events.noEvents")}
                icon={<CalendarDays size={34} color={editorial.brand} />}
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

        <AdminEventSheet visible={sheetVisible} editingEvent={editingEvent} onClose={closeEditor} />
        <CancelEventSheet {...cancellation.sheet} />
        {registrationsEvent ? (
          <EventRegistrationsManagerSheet
            eventId={registrationsEvent.id}
            eventTitle={registrationsEvent.title}
            onClose={() => setRegistrationsEvent(null)}
          />
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { gap: 14, paddingTop: 16, paddingBottom: 8 },
  skeletons: { gap: 10 },
  separator: { height: 10 },
});
