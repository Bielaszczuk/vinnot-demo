/**
 * ReviewsList — wine reviews section.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SquarePen } from "lucide-react-native";
import { Button } from "@/presentation/components/ui/Button";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { Chip } from "@/presentation/components/ui/Chip";
import { useMyReviewStatus, useWineReviews } from "@/presentation/hooks/queries/wine/useWines";
import { useAuth } from "@/presentation/hooks/useAuth";
import { PAGINATION } from "@/shared/config/constants";
import { editorial, lightTokens } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { ReviewItem } from "./ReviewItem";
import type { WineReview, WineType } from "@/domain/wine/wine.types";

type ReviewSort = "recent" | "popular";

const SORT_OPTIONS: { value: ReviewSort; labelKey: string }[] = [
  { value: "recent", labelKey: "reviews.sortRecent" },
  { value: "popular", labelKey: "reviews.sortPopular" },
];

interface ReviewsListProps {
  wineId: string;
  focusOwnReview?: boolean;
  onOwnReviewLayout?: () => void;
  /** The reviewed wine's type: the rating glasses follow it. */
  wineType?: WineType | null;
  /** Opens the review sheet to write a new review. */
  onWriteReview: () => void;
  /** Opens the review sheet to edit the reader's own review. */
  onEditReview: (review: WineReview) => void;
}

export function ReviewsList({
  wineId, focusOwnReview = false, onOwnReviewLayout, wineType, onWriteReview, onEditReview,
}: ReviewsListProps) {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [page, setPage] = useState(0);
  const reviewsQuery = useWineReviews(wineId, {
    page,
    pageSize: PAGINATION.DETAIL_PAGE_SIZE,
    filter: sort,
  });
  const { data, isLoading } = reviewsQuery;
  const totalPages = data?.totalPages ?? 0;
  const chooseSort = (next: ReviewSort) => {
    setSort(next);
    setPage(0);
  };
  const { data: myReviewStatus } = useMyReviewStatus(isAuthenticated ? wineId : undefined);
  const ownReviewQuery = useWineReviews(isAuthenticated && focusOwnReview ? wineId : undefined,
    { page: 0, pageSize: 1, filter: "mine" });
  const ownReview = ownReviewQuery.currentData?.items[0];
  const loadingOwnReview = ownReviewQuery.isLoading || (ownReviewQuery.isFetching && !ownReviewQuery.currentData);
  // The own review is pinned on the first page only, so later pages stay in server order.
  const visibleReviews = ownReview && page === 0
    ? [ownReview, ...(data?.items ?? []).filter((review) => review.id !== ownReview.id)]
    : data?.items ?? [];
  const myReview = visibleReviews.find((review) => review.userId === user?.id) ?? null;
  const canCreateReview = isAuthenticated && !loadingOwnReview && !ownReviewQuery.isError && !myReviewStatus?.hasReview && !myReview;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>{t("wines.reviewsTitle")}</Text>
        {!!data?.total && <Text style={styles.count}>{data.total}</Text>}
      </View>

      {!!data?.total && data.total > 1 && (
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={t(option.labelKey)}
              selected={sort === option.value}
              onPress={() => chooseSort(option.value)}
            />
          ))}
        </View>
      )}

      {canCreateReview ? (
        <Button variant="outline" leftIcon={<SquarePen size={16} color={editorial.brand} />} onPress={onWriteReview}>
          {t("reviews.writeReview")}
        </Button>
      ) : isAuthenticated && (myReviewStatus?.hasReview || myReview) ? (
        <Text style={styles.helperText}>{t("wines.alreadyReviewed", "Ya compartiste tu reseña para este vino.")}</Text>
      ) : null}

      {ownReviewQuery.isError && <QueryErrorState error={ownReviewQuery.error}
        onRetry={() => void ownReviewQuery.refetch()} />}
      {(isLoading || loadingOwnReview) && !visibleReviews.length ? (
        <View style={styles.loading}>
          <Skeleton height={72} radius={12} />
          <Skeleton height={72} radius={12} />
        </View>
      ) : visibleReviews.length ? (
        visibleReviews.map((review) => (
          <View key={review.id} onLayout={review.id === ownReview?.id ? onOwnReviewLayout : undefined}>
          <ReviewItem
            wineId={wineId}
            review={review}
            expandedComments={expandedReviewId === review.id}
            onToggleComments={() => setExpandedReviewId((current) => (current === review.id ? null : review.id))}
            onEdit={() => onEditReview(review)}
            wineType={wineType}
          />
          </View>
        ))
      ) : reviewsQuery.isError ? (
        <QueryErrorState error={reviewsQuery.error} onRetry={() => void reviewsQuery.refetch()} />
      ) : !ownReviewQuery.isError ? (
        <EmptyState
          illustration="noReviews"
          title={t("wines.noReviews")}
          description={t("wines.noReviewsDescription")}
          style={styles.empty}
        />
      ) : null}

      {totalPages > 1 && (
        <View style={styles.pager}>
          <PagerButton
            label={t("common.previous")}
            disabled={!data?.hasPrevious}
            onPress={() => setPage((current) => Math.max(0, current - 1))}
          />
          <Text style={styles.pageLabel}>
            {t("reviews.page", { current: page + 1, total: totalPages })}
          </Text>
          <PagerButton
            label={t("common.next")}
            disabled={!data?.hasNext}
            onPress={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
          />
        </View>
      )}
    </View>
  );
}

function PagerButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={[styles.pagerButton, disabled && styles.pagerButtonDisabled]}
    >
      <Text style={styles.pagerButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 16 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heading: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  count: { ...textStyles.labelMedium, color: lightTokens.textTertiary },
  helperText: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  loading: { gap: 12 },
  empty: { minHeight: 160, paddingVertical: 20 },
  sortRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  pageLabel: { ...textStyles.labelMedium, color: lightTokens.textTertiary },
  pagerButton: { paddingVertical: 8, paddingHorizontal: 4 },
  pagerButtonDisabled: { opacity: 0.4 },
  pagerButtonText: { ...textStyles.labelMedium, color: editorial.brand },
});
