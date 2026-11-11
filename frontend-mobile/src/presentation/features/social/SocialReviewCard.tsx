/**
 * SocialReviewCard — a review in the following feed or on a profile: who wrote it,
 * the wine, the glasses and the text. The author opens their profile, the wine its detail.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Wine as WineIcon } from "lucide-react-native";
import type { UserReview } from "@/domain/social/social.types";
import { Avatar, UserHandle } from "@/presentation/components/ui/Atoms";
import { VintagePill } from "@/presentation/components/ui/VintagePill";
import { NameBadge } from "@/presentation/features/points/NameBadge";
import { RatingGlasses } from "@/presentation/features/wine/rating/RatingGlasses";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

interface SocialReviewCardProps {
  review: UserReview;
  /** Hidden on the author's own profile, where every review is theirs. */
  showReviewer?: boolean;
  onUserPress?: (userId: string) => void;
  onWinePress: (wineId: string) => void;
}

export function SocialReviewCard({ review, showReviewer = true, onUserPress, onWinePress }: SocialReviewCardProps) {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const { reviewer, wine } = review;

  return (
    <View style={styles.card} accessibilityLabel={t("social.reviewOfA11y", { wine: wine.name, name: reviewer.displayName })}>
      {showReviewer ? (
        <Pressable
          style={styles.author}
          onPress={() => onUserPress?.(reviewer.id)}
          accessibilityRole="link"
          accessibilityLabel={t("social.openProfileA11y", { name: reviewer.displayName })}
          hitSlop={4}
        >
          <Avatar uri={reviewer.avatarUrl} name={reviewer.displayName} size={34} />
          <View style={styles.authorText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {reviewer.displayName}
              </Text>
              <NameBadge tier={reviewer.tier} />
            </View>
            <UserHandle username={reviewer.username} />
            <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
          </View>
        </Pressable>
      ) : null}
      <Pressable
        style={styles.wine}
        onPress={() => onWinePress(wine.id)}
        accessibilityRole="link"
        accessibilityLabel={wine.name}
      >
        <View style={styles.wineImage}>
          {wine.imageUrl ? (
            <Image source={{ uri: wine.imageUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
          ) : (
            <WineIcon size={18} color={lightTokens.textTertiary} />
          )}
        </View>
        <View style={styles.wineText}>
          <Text style={styles.wineName} numberOfLines={1}>
            {wine.name}
          </Text>
          {wine.wineryName ? (
            <Text style={styles.winery} numberOfLines={1}>
              {wine.wineryName}
            </Text>
          ) : null}
          {!showReviewer ? <Text style={styles.date}>{formatDate(review.createdAt)}</Text> : null}
        </View>
        <RatingGlasses rating={review.rating} wineType={wine.type} size={22} />
      </Pressable>
      {review.vintage != null ? <VintagePill year={review.vintage} /> : null}
      {review.title ? <Text style={styles.title}>{review.title}</Text> : null}
      {review.comment ? (
        <Text style={styles.comment} numberOfLines={5}>
          {review.comment}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  author: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { ...textStyles.labelLarge, color: lightTokens.textPrimary, flexShrink: 1 },
  date: { ...textStyles.caption, color: lightTokens.textTertiary },
  wine: { flexDirection: "row", alignItems: "center", gap: 10 },
  wineImage: {
    width: 40,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
    backgroundColor: lightTokens.bgMuted,
    overflow: "hidden",
  },
  wineText: { flex: 1, minWidth: 0, gap: 1 },
  wineName: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
  winery: { ...textStyles.caption, color: lightTokens.textSecondary },
  title: { ...textStyles.labelLarge, color: lightTokens.textPrimary },
  comment: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
});
