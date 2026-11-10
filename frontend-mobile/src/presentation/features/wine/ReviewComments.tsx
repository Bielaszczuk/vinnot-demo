import { useToast } from "@/presentation/providers/ToastProvider";
import { PublicationStatus } from "../community/PublicationStatus";
import { CommunityActions } from '../community/CommunityActions';
/**
 * ReviewComments — comments list and creation for a wine review.
 */
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/presentation/components/ui/Atoms";
import { NameBadge } from "@/presentation/features/points/NameBadge";
import { Button } from "@/presentation/components/ui/Button";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { useCommentDraft } from "@/presentation/hooks/useReviewDrafts";
import { ROLES } from "@/shared/config/roles";
import { useReviewComments, useCreateReviewComment, useDeleteReviewComment } from "@/presentation/hooks/queries/wine/useWines";
import { useAuth } from "@/presentation/hooks/useAuth";
import { radii } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";

interface ReviewCommentsProps {
  wineId: string;
  reviewId: string;
}

export function ReviewComments({ wineId, reviewId }: ReviewCommentsProps) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const { user, isAuthenticated, hasAnyRole } = useAuth();
  const commentsQuery = useReviewComments(wineId, reviewId);
  const { data: comments = [], isLoading } = commentsQuery;
  const createComment = useCreateReviewComment();
  const deleteComment = useDeleteReviewComment();
  // The unsent comment survives collapsing the comments and leaving the wine.
  const { content, save: setContent, clear: clearDraft } = useCommentDraft(reviewId);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    try {
      await createComment.mutateAsync({ wineId, reviewId, content: trimmed });
      clearDraft();
      showSuccess(t("community.commentPublished"));
    } catch {
      showError(t("community.error"));
    }
  };

  const confirmDelete = (commentId: string) => {
    Alert.alert(
      t("wines.deleteComment", "Eliminar comentario"),
      t("wines.deleteCommentConfirm", "¿Querés eliminar este comentario?"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete", "Eliminar"),
          style: "destructive",
          onPress: () => {
            setDeletingId(commentId);
            deleteComment.mutate(
              { wineId, reviewId, commentId },
              {
                onSuccess: () => {
                  setDeletingId(null);
                  showSuccess(t("reviews.comments.deleted"));
                },
                onError: () => {
                  setDeletingId(null);
                  showError(t("reviews.comments.errorDelete"));
                },
              },
            );
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        <Skeleton height={48} radius={12} />
      </View>
    );
  }

  if (commentsQuery.isError) {
    return (
      <View style={styles.wrapper}>
        <QueryErrorState error={commentsQuery.error} onRetry={() => void commentsQuery.refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {comments.map((comment) => {
        const canDelete =
          user?.id === comment.reviewer?.id || hasAnyRole([ROLES.ADMIN, ROLES.MODERATOR]);
        return (
          <View key={comment.id} style={styles.commentRow}>
            <Avatar uri={comment.reviewer?.avatarUrl} name={comment.reviewer?.displayName ?? "?"} size={28} />
            <View style={styles.commentBody}>
              <View style={styles.commentHeader}>
                <View style={styles.authorRow}>
                  <Text style={styles.commentAuthor} numberOfLines={1}>{comment.reviewer?.displayName ?? comment.reviewer?.username ?? t("reviews.user")}</Text>
                  <NameBadge tier={comment.reviewer?.badgeTier} size={18} />
                </View>
                <View style={styles.commentMenu}>
                  <CommunityActions variant="menu" targetType="COMMENT" targetId={comment.id} authorId={comment.reviewer?.id} />
                </View>
              </View>
              <Text style={styles.commentText}>{comment.content}</Text>
              <PublicationStatus status={comment.publicationStatus} />
            </View>
            {canDelete && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("wines.deleteComment", "Eliminar comentario")}
                accessibilityState={{ disabled: deletingId === comment.id }}
                disabled={deletingId === comment.id}
                onPress={() => confirmDelete(comment.id)}
                hitSlop={8}
                style={styles.deleteButton}
              >
                <Trash2 size={16} color={vinnotColors.danger} />
              </Pressable>
            )}
          </View>
        );
      })}
      {isAuthenticated && (
        <View style={styles.form}>
          <TextInput
            maxLength={2000}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            accessibilityLabel={t("wines.commentPlaceholder", "Escribí un comentario…")}
            placeholder={t("wines.commentPlaceholder", "Escribí un comentario…")}
            placeholderTextColor={vinnotColors.placeholder}
            style={styles.input}
          />
          <Button size="sm" onPress={submit} loading={createComment.isPending} disabled={!content.trim()}>
            {t("common.send", "Enviar")}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: vinnotColors.border,
    paddingTop: 12,
  },
  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  commentBody: {
    flex: 1,
    borderRadius: radii.lg,
    padding: 10,
    backgroundColor: vinnotColors.canvas,
  },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  // Tuck the 36pt trigger into the bubble corner without growing the header row.
  commentMenu: { marginVertical: -10, marginRight: -6 },
  deleteButton: { paddingTop: 10 },
  authorRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  commentAuthor: {
    flexShrink: 1,
    color: vinnotColors.brandDeep,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.xs,
    lineHeight: 16,
  },
  commentText: {
    color: vinnotColors.muted,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 19,
  },
  form: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: vinnotColors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: vinnotColors.ink,
    backgroundColor: vinnotColors.surface,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    minHeight: 40,
    maxHeight: 120,
  },
});
