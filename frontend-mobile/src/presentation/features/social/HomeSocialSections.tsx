/**
 * Home social sections for a signed-in user, at the end of Home: «De gente que seguís»
 * (the latest reviews of followed people, «Ver todo» opens the full feed) and
 * «Personas para seguir». Same headings as the other Home sections, compact cards.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { Users, Wine as WineIcon } from "lucide-react-native";
import type { SuggestedUser, UserReview } from "@/domain/social/social.types";
import { Avatar, UserHandle } from "@/presentation/components/ui/Atoms";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { NameBadge } from "@/presentation/features/points/NameBadge";
import { RatingGlasses } from "@/presentation/features/wine/rating/RatingGlasses";
import { HomeListHeader } from "@/presentation/features/home/HomeSectionHeaders";
import { styles as homeStyles } from "@/presentation/features/home/HomeScreenView.styles";
import { iconStrokes, lightTokens, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { FollowButton } from "./FollowButton";

export interface HomeSocialSectionsProps {
  feed: UserReview[];
  feedLoading: boolean;
  feedError?: unknown;
  onRetryFeed: () => void;
  suggestions: SuggestedUser[];
  suggestionsLoading: boolean;
  onSeeAllFeed: () => void;
  onUserPress: (userId: string) => void;
  onWinePress: (wineId: string) => void;
}

/** A review in two lines of text: wine thumbnail, who wrote it, the wine and its glasses. */
function HomeFeedCard({
  review,
  onUserPress,
  onWinePress,
}: {
  review: UserReview;
  onUserPress: (userId: string) => void;
  onWinePress: (wineId: string) => void;
}) {
  const { t } = useTranslation();
  const { reviewer, wine: reviewed } = review;
  const text = [review.title, review.comment].filter(Boolean).join(" · ");
  return (
    <Pressable
      style={styles.feedCard}
      onPress={() => onWinePress(reviewed.id)}
      accessibilityRole="link"
      accessibilityLabel={t("social.reviewOfA11y", { wine: reviewed.name, name: reviewer.displayName })}
    >
      <View style={styles.thumb}>
        {reviewed.imageUrl ? (
          <Image source={{ uri: reviewed.imageUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
        ) : (
          <WineIcon size={18} color={lightTokens.textTertiary} strokeWidth={iconStrokes.regular} />
        )}
      </View>
      <View style={styles.feedBody}>
        <Pressable
          style={styles.reviewer}
          onPress={() => onUserPress(reviewer.id)}
          accessibilityRole="link"
          accessibilityLabel={t("social.openProfileA11y", { name: reviewer.displayName })}
          hitSlop={6}
        >
          <Avatar uri={reviewer.avatarUrl} name={reviewer.displayName} size={22} />
          <View style={styles.reviewerText}>
            <View style={styles.reviewerNameRow}>
              <Text style={styles.reviewerName} numberOfLines={1}>
                {reviewer.displayName}
              </Text>
              <NameBadge tier={reviewer.tier} />
            </View>
            <UserHandle username={reviewer.username} style={styles.reviewerHandle} />
          </View>
        </Pressable>
        <Text style={styles.wineName} numberOfLines={1}>
          {reviewed.name}
        </Text>
        <RatingGlasses rating={review.rating} wineType={reviewed.type} size={18} />
        {text ? (
          <Text style={styles.reviewText} numberOfLines={2}>
            {text}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function SuggestionCard({ person, onOpen }: { person: SuggestedUser; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.suggestion}>
      <Pressable
        style={styles.suggestionPerson}
        onPress={onOpen}
        accessibilityRole="link"
        accessibilityLabel={t("social.openProfileA11y", { name: person.displayName })}
      >
        <Avatar uri={person.avatarUrl} name={person.displayName} size={56} />
        <View style={styles.suggestionNameRow}>
          <Text style={styles.suggestionName} numberOfLines={1}>
            {person.displayName}
          </Text>
          <NameBadge tier={person.tier} />
        </View>
        {person.affinityPercent != null ? (
          <Text style={styles.affinityChip}>{t("social.suggestionAffinity", { percent: person.affinityPercent })}</Text>
        ) : (
          <View style={styles.affinitySpacer} />
        )}
      </Pressable>
      <FollowButton userId={person.id} name={person.displayName} following={false} style={styles.suggestionButton} />
    </View>
  );
}

export function HomeSocialSections({
  feed,
  feedLoading,
  feedError,
  onRetryFeed,
  suggestions,
  suggestionsLoading,
  onSeeAllFeed,
  onUserPress,
  onWinePress,
}: HomeSocialSectionsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Animated.View entering={FadeInDown.duration(500).delay(420)} style={homeStyles.section} testID="home-social-feed">
        <HomeListHeader title={t("social.feedTitle")} actionLabel={t("social.seeAll")} onAction={onSeeAllFeed} />
        <View style={styles.feed}>
          {feedLoading ? (
            Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} height={96} radius={radii.lg} />)
          ) : feedError && feed.length === 0 ? (
            <QueryErrorState error={feedError} onRetry={onRetryFeed} />
          ) : feed.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Users size={18} color={wine[700]} strokeWidth={iconStrokes.regular} />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>{t("social.feedEmptyTitle")}</Text>
                <Text style={styles.emptyBody}>{t("social.feedEmptyBody")}</Text>
              </View>
            </View>
          ) : (
            feed.map((review) => (
              <HomeFeedCard key={review.id} review={review} onUserPress={onUserPress} onWinePress={onWinePress} />
            ))
          )}
        </View>
      </Animated.View>

      {suggestionsLoading || suggestions.length > 0 ? (
        <Animated.View
          entering={FadeInDown.duration(500).delay(460)}
          style={homeStyles.section}
          testID="home-social-suggestions"
        >
          <HomeListHeader title={t("social.suggestionsTitle")} />
          {suggestionsLoading ? (
            <Skeleton height={176} radius={radii.lg} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions}>
              {suggestions.map((person) => (
                <SuggestionCard key={person.id} person={person} onOpen={() => onUserPress(person.id)} />
              ))}
            </ScrollView>
          )}
        </Animated.View>
      ) : null}
    </>
  );
}

const card = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: lightTokens.borderDefault,
  backgroundColor: lightTokens.surfaceDefault,
} as const;

const styles = StyleSheet.create({
  feed: { gap: 10 },
  feedCard: { ...card, flexDirection: "row", gap: 12, padding: 12 },
  thumb: {
    width: 52,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: lightTokens.bgMuted,
    overflow: "hidden",
  },
  feedBody: { flex: 1, minWidth: 0, gap: 3 },
  reviewer: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", maxWidth: "100%" },
  reviewerText: { flexShrink: 1, minWidth: 0 },
  reviewerNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  reviewerName: { ...textStyles.caption, color: lightTokens.textSecondary, flexShrink: 1 },
  // Smaller than the caption name: the compact Home card keeps the handle secondary.
  reviewerHandle: { ...textStyles.labelSmall, color: lightTokens.textTertiary },
  wineName: { ...textStyles.labelLarge, color: lightTokens.textPrimary },
  reviewText: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
  empty: { ...card, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: wine[50],
  },
  emptyCopy: { flex: 1, gap: 2 },
  emptyTitle: { ...textStyles.labelLarge, color: lightTokens.textPrimary },
  emptyBody: { ...textStyles.caption, color: lightTokens.textSecondary },
  suggestions: { gap: 10, paddingRight: 4 },
  suggestion: { ...card, width: 148, alignItems: "center", gap: 10, padding: 12 },
  suggestionPerson: { alignItems: "center", gap: 6, alignSelf: "stretch" },
  suggestionNameRow: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "100%" },
  suggestionName: { ...textStyles.labelLarge, color: lightTokens.textPrimary, flexShrink: 1 },
  affinityChip: {
    ...textStyles.caption,
    color: wine[800],
    backgroundColor: wine[50],
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  affinitySpacer: { height: 20 },
  suggestionButton: { alignSelf: "stretch" },
});
