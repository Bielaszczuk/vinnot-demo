import { PublicationStatus } from "../community/PublicationStatus";
import { CommunityActions } from '../community/CommunityActions';
/**
 * ReviewItem — single wine review card.
 */
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { MessageCircle, Pencil, ThumbsUp, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { createUserProfileRoute } from "@/presentation/navigation/discoveryNavigation";
import { Avatar, UserHandle } from "@/presentation/components/ui/Atoms";
import { NameBadge } from "@/presentation/features/points/NameBadge";
import type { WineType } from "@/domain/wine/wine.types";
import { RatingGlasses } from "./rating/RatingGlasses";
import { Button } from "@/presentation/components/ui/Button";
import { VintagePill } from "@/presentation/components/ui/VintagePill";
import { ROLES } from "@/shared/config/roles";
import { useDeleteWineReview, useToggleReviewLike } from "@/presentation/hooks/queries/wine/useWines";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useToast } from "@/presentation/providers/ToastProvider";
import { lightTokens, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import type { WineReview } from "@/domain/wine/wine.types";
import { ReviewComments } from "./ReviewComments";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";

interface ReviewItemProps {
  wineId: string;
  review: WineReview;
  expandedComments?: boolean;
  onToggleComments: () => void;
  onEdit: () => void;
  /** Glasses follow the reviewed wine's type. */
  wineType?: WineType | null;
}

export function ReviewItem({ wineId, review, expandedComments, onToggleComments, onEdit, wineType }: ReviewItemProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { formatDate } = useFormatters();
  const { user, hasAnyRole } = useAuth();
  const { showSuccess, showError } = useToast();
  const toggleLike = useToggleReviewLike();
  const deleteReview = useDeleteWineReview();
  const isOwner = !!user && user.id === review.userId;
  const canEdit = isOwner || hasAnyRole([ROLES.ADMIN]);
  const canDelete = isOwner || hasAnyRole([ROLES.ADMIN, ROLES.MODERATOR]);
  const unpublished = !!review.publicationStatus && review.publicationStatus !== "APPROVED";
  const likes = review.likesCount || review.helpfulCount || 0;
  // One toggle at a time: a second tap while the first is saving would undo it.
  const likeDisabled = toggleLike.isPending || (unpublished && !review.likedByCurrentUser);
  const commentsDisabled = unpublished;
  const like = () => {
    if (toggleLike.isPending) return;
    toggleLike.mutate(
      { wineId, reviewId: review.id, liked: review.likedByCurrentUser },
      { onError: () => showError(t("reviews.errorLike")) },
    );
  };

  const confirmDelete = () => {
    Alert.alert(
      t("wines.deleteReview", "Eliminar reseña"),
      t("wines.deleteReviewConfirm", "¿Querés eliminar esta reseña?"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete", "Eliminar"),
          style: "destructive",
          onPress: () =>
            deleteReview.mutate(
              { wineId, reviewId: review.id },
              {
                onSuccess: () => showSuccess(t("reviews.deleted")),
                onError: () => showError(t("reviews.errorDelete")),
              },
            ),
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {/* The author's avatar and name open their public profile. */}
        <Pressable
          style={styles.author}
          disabled={!review.userId}
          onPress={() => router.push(createUserProfileRoute(review.userId))}
          accessibilityRole="link"
          accessibilityLabel={t("social.openProfileA11y", { name: review.userName })}
          hitSlop={4}
        >
          <Avatar uri={review.userAvatar} name={review.userName} size={38} />
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>{review.userName}</Text>
              <NameBadge tier={review.reviewer?.badgeTier} />
            </View>
            <UserHandle username={review.reviewer?.username} />
            <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
          </View>
        </Pressable>
        <RatingGlasses rating={review.rating} wineType={wineType} size={26} />
        <CommunityActions variant="menu" targetType="REVIEW" targetId={review.id} authorId={review.userId} />
      </View>
      <PublicationStatus status={review.publicationStatus} />
      {review.vintage != null && <VintagePill year={review.vintage} />}
      {!!review.title && <Text style={styles.title}>{review.title}</Text>}
      {!!review.comment && <Text style={styles.comment}>{review.comment}</Text>}

      <View style={styles.actions}>
        <Pressable
          disabled={likeDisabled}
          onPress={like}
          accessibilityRole="button"
          accessibilityLabel={t("reviews.likeLabel", { count: likes })}
          accessibilityState={{ selected: !!review.likedByCurrentUser, disabled: likeDisabled }}
          hitSlop={4}
          style={styles.actionButton}
        >
          <ThumbsUp
            size={16}
            color={review.likedByCurrentUser ? wine[700] : lightTokens.textTertiary}
            fill={review.likedByCurrentUser ? wine[100] : "transparent"}
          />
          <Text style={[styles.actionText, review.likedByCurrentUser && styles.actionTextActive]}>
            {likes}
          </Text>
        </Pressable>

        <Pressable
          disabled={commentsDisabled}
          onPress={onToggleComments}
          accessibilityRole="button"
          accessibilityLabel={t("reviews.commentsLabel", { count: review.commentsCount })}
          accessibilityState={{ selected: !!expandedComments, expanded: !!expandedComments, disabled: commentsDisabled }}
          hitSlop={4}
          style={styles.actionButton}
        >
          <MessageCircle size={16} color={expandedComments ? wine[700] : lightTokens.textTertiary} />
          <Text style={[styles.actionText, expandedComments && styles.actionTextActive]}>
            {review.commentsCount}
          </Text>
        </Pressable>

        {(canEdit || canDelete) && (
          <View style={styles.manageActions}>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Pencil size={14} color={wine[700]} />}
                onPress={onEdit}
              >
                {t("common.edit", "Editar")}
              </Button>
            )}
            {canDelete && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("wines.deleteReview", "Eliminar reseña")}
                accessibilityState={{ disabled: deleteReview.isPending }}
                disabled={deleteReview.isPending}
                onPress={confirmDelete}
                style={styles.deleteButton}
              >
                <Trash2 size={16} color={lightTokens.danger} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {expandedComments && (!review.publicationStatus || review.publicationStatus === "APPROVED") && <ReviewComments wineId={wineId} reviewId={review.id} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: lightTokens.borderDefault,
    paddingVertical: 16,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  author: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerText: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { ...textStyles.labelLarge, color: lightTokens.textPrimary, flexShrink: 1 },
  date: { ...textStyles.caption, color: lightTokens.textTertiary },
  title: { ...textStyles.titleSmall, color: lightTokens.textPrimary },
  comment: { ...textStyles.bodyMedium, color: lightTokens.textSecondary },
  actions: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 2 },
  // 44pt minimum touch target for the like and comment toggles.
  actionButton: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 44, minWidth: 44, paddingHorizontal: 6 },
  actionText: { ...textStyles.labelMedium, color: lightTokens.textTertiary },
  actionTextActive: { color: wine[700] },
  manageActions: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 },
  deleteButton: { padding: 8, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
});
