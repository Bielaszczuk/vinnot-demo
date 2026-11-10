import { AdminDetailSheet } from "./AdminDetailSheet";
import { ADMIN_ROUTE, goBackOr } from "@/presentation/navigation/discoveryNavigation";
import { Button } from "@/presentation/components/ui/Button";
import { adminCommunityStyles as detailStyles } from "../community/AdminCommunityParts";
import { AdminQueryError } from "@/presentation/features/admin/AdminQueryError";
import { useToast } from "@/presentation/providers/ToastProvider";
/**
 * Admin — Moderar reseñas (delete, pagination, rich rows).
 * Matches web AdminReviewsPage.
 */
import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { Heart, Star, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/presentation/components/layout";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { ImageWithFallback } from "@/presentation/components/ui/ImageWithFallback";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { AdminPageHero } from "./AdminPageHero";
import { AdminPaginationBar } from "./AdminPaginationBar";
import { AdminSearchBar } from "./AdminSearchBar";
import { useAdminReviews, useAdminReviewMutations } from "@/presentation/hooks/queries/admin";
import { useDebounce } from "@/presentation/hooks/ui";
import { editorial, lightTokens, layout, radii, systemColors, wine } from "@/shared/theme/tokens";
import { textStyles, fontFamilies } from "@/shared/theme/typography";
import type { AdminReview } from "@/domain/admin/admin.types";
import { NameBadge } from "@/presentation/features/points/NameBadge";
import { RatingGlasses } from "@/presentation/features/wine/rating/RatingGlasses";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";

const PAGE_SIZE = 20;

function ReviewRow({
  item,
  onDelete,
  onOpen,
}: {
  item: AdminReview;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { formatRating } = useFormatters();
  const avatar = item.reviewer?.avatarUrl;
  const initials = (item.reviewer?.displayName ?? item.reviewer?.username ?? "?")
    .charAt(0)
    .toUpperCase();
  const dateStr = new Date(item.createdAt).toLocaleDateString(
    i18n.resolvedLanguage ?? i18n.language,
    { day: "numeric", month: "short", year: "numeric" },
  );

  return (
    <View style={rowStyles.card}>
      {/* Avatar */}
      {avatar ? (
        <ImageWithFallback
          uri={avatar}
          alt={initials}
          style={rowStyles.avatar}
          containerStyle={rowStyles.avatar}
        />
      ) : (
        <View style={[rowStyles.avatar, rowStyles.avatarFallback]}>
          <Text style={rowStyles.avatarText}>{initials}</Text>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("community.openCase")}
        onPress={onOpen}
        style={rowStyles.body}
      >
        <View style={rowStyles.topRow}>
          <View style={rowStyles.nameRow}>
            <Text numberOfLines={1} style={rowStyles.username}>
              {item.reviewer?.displayName ?? item.reviewer?.username ?? t("common.anonymous")}
            </Text>
            <NameBadge tier={item.reviewer?.badgeTier} size={18} />
          </View>
          <RatingGlasses rating={item.rating} size={20} />
          <Text style={rowStyles.ratingNum}>{formatRating(item.rating)}</Text>
        </View>
        {item.wine && (
          <Text numberOfLines={1} style={rowStyles.wine}>
            {item.wine.name}
            {item.wine.vintage ? ` ${item.wine.vintage}` : ""}
          </Text>
        )}
        {!!item.title && (
          <Text numberOfLines={1} style={rowStyles.title}>
            {item.title}
          </Text>
        )}
        {!!item.comment && (
          <Text numberOfLines={2} style={rowStyles.comment}>
            "{item.comment}"
          </Text>
        )}
        <View style={rowStyles.footer}>
          <View style={rowStyles.likesRow}>
            <Heart size={11} color="#f43f5e" fill="#f43f5e" />
            <Text style={rowStyles.likes}>{item.likesCount}</Text>
          </View>
          <Text style={rowStyles.date}>{dateStr}</Text>
        </View>
      </Pressable>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={t("admin.reviews.deleteAction")}
        onPress={onDelete}
        hitSlop={10}
        style={rowStyles.deleteBtn}
      >
        <Trash2 size={16} color={lightTokens.danger} />
      </MotionPressable>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: lightTokens.surfaceDefault,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: {
    backgroundColor: wine[50],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: wine[200],
  },
  avatarText: { ...textStyles.titleSmall, color: editorial.brand },
  body: { flex: 1, gap: 3 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nameRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  username: { flexShrink: 1, ...textStyles.labelMedium, color: lightTokens.textPrimary },
  ratingNum: { ...textStyles.caption, color: lightTokens.textTertiary },
  wine: { ...textStyles.caption, color: editorial.brand, fontFamily: fontFamilies.semibold },
  title: { ...textStyles.labelMedium, color: lightTokens.textSecondary },
  comment: { ...textStyles.caption, color: lightTokens.textTertiary, fontStyle: "italic" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  likesRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  likes: { ...textStyles.caption, color: lightTokens.textTertiary },
  date: { ...textStyles.caption, color: lightTokens.textDisabled },
  deleteBtn: {
    width: 44,
    height: 44,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    backgroundColor: systemColors.dangerLight,
  },
});

export function AdminReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { formatRating } = useFormatters();
  const [selected, setSelected] = useState<AdminReview | null>(null);
  const [confirmingDeletion, setConfirmingDeletion] = useState(false);
  const deleting = useRef(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useAdminReviews(
    page,
    PAGE_SIZE,
    debouncedSearch || undefined,
  );
  const { showError, showSuccess } = useToast();
  const { remove } = useAdminReviewMutations();
  const items: AdminReview[] = data?.items ?? [];
  const totalPages = Math.ceil((data?.totalItems ?? 0) / PAGE_SIZE);

  const deleteReview = (item: AdminReview) => {
    if (deleting.current) return;
    deleting.current = true;
    remove.mutate(item.id, {
      onSuccess: () => {
        deleting.current = false;
        setSelected(null);
        setConfirmingDeletion(false);
        showSuccess(t("community.decisionSaved"));
        if (page > 0 && items.length === 1) setPage(page - 1);
      },
      onError: () => {
        deleting.current = false;
        showError(t("admin.feedback.deleteError"));
      },
    });
  };

  const confirmDelete = (item: AdminReview) => {
    if (deleting.current) return;
    Alert.alert(t("admin.reviews.deleteTitle"), t("admin.reviews.deleteMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => deleteReview(item),
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: lightTokens.bgBase }}>
      <AppHeader title={t("admin.actions.moderateReviews")} showBack onBack={() => goBackOr(router, ADMIN_ROUTE)} />

      <FlashList<AdminReview>
        data={isLoading ? [] : items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReviewRow
            item={item}
            onOpen={() => {
              setConfirmingDeletion(false);
              setSelected(item);
            }}
            onDelete={() => confirmDelete(item)}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <AdminPageHero
              title={t("admin.reviews.title")}
              subtitle={t("admin.reviews.subtitle")}
              section="reviews"
            />
            <AdminSearchBar
              value={search}
              onChangeText={(t) => {
                setSearch(t);
                setPage(0);
              }}
              placeholder={t("admin.reviews.searchPlaceholder")}
              resultCount={isLoading ? undefined : data?.totalItems}
            />
            {isLoading && (
              <View style={styles.skeletons}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} height={100} radius={radii["2xl"]} />
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
            countKey="admin.reviews.count"
            onPageChange={setPage}
          />
        }
        ListEmptyComponent={
          isError ? (
            <AdminQueryError retry={refetch} />
          ) : !isLoading ? (
            <EmptyState
              title={t("common.noResults")}
              description={t("admin.reviews.noReviews")}
              icon={<Star size={34} color={editorial.brand} />}
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
      <AdminDetailSheet
        visible={!!selected}
        title={selected?.wine?.name ?? t("admin.reviews.title")}
        subtitle={selected?.reviewer?.displayName ?? selected?.reviewer?.username}
        busy={remove.isPending}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <View style={detailStyles.evidence}>
              <Text style={detailStyles.rowTitle}>{formatRating(selected.rating)}/5</Text>
              {!!selected.title && <Text style={detailStyles.rowTitle}>{selected.title}</Text>}
              {!!selected.comment && (
                <Text selectable style={detailStyles.preview}>
                  {selected.comment}
                </Text>
              )}
            </View>
            <Text style={detailStyles.help}>
              {new Date(selected.createdAt).toLocaleDateString(i18n.resolvedLanguage ?? i18n.language)}
            </Text>
            {/* Keep confirmation inside the sheet: native alerts and modal dismissal
                compete for iOS presentation when a fast delete resolves. */}
            {confirmingDeletion ? (
              <View style={detailStyles.evidence}>
                <Text style={detailStyles.help}>{t("admin.reviews.deleteMessage")}</Text>
                <Button
                  variant="danger"
                  loading={remove.isPending}
                  onPress={() => deleteReview(selected)}
                >
                  {t("common.delete")}
                </Button>
                <Button
                  variant="outline"
                  disabled={remove.isPending}
                  onPress={() => setConfirmingDeletion(false)}
                >
                  {t("common.cancel")}
                </Button>
              </View>
            ) : (
              <Button variant="danger" onPress={() => setConfirmingDeletion(true)}>
                {t("admin.reviews.deleteAction")}
              </Button>
            )}
            <Button variant="ghost" disabled={remove.isPending} onPress={() => setSelected(null)}>
              {t("common.close")}
            </Button>
          </>
        )}
      </AdminDetailSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 14, paddingTop: 16, paddingBottom: 8 },
  skeletons: { gap: 10 },
  separator: { height: 10 },
});
