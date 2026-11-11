/**
 * PublicProfileScreen — /users/{id}: anyone's public profile, one's own included.
 * Others get Follow / Following; one's own profile gets Edit profile instead.
 */
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react-native";
import { AppHeader } from "@/presentation/components/layout";
import { Chip } from "@/presentation/components/ui/Atoms";
import { Button } from "@/presentation/components/ui/Button";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { CommunityActions } from "@/presentation/features/community/CommunityActions";
import { EditProfileSheet } from "@/presentation/features/user/EditProfileSheet";
import { useAuth } from "@/presentation/hooks/useAuth";
import {
  PROFILE_ROUTE,
  TASTE_QUIZ_ROUTE,
  createUserFollowersRoute,
  createUserFollowingRoute,
} from "@/presentation/navigation/discoveryNavigation";
import { createWineDetailRoute } from "@/presentation/navigation/wineNavigation";
import { layout, lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { FollowButtonView } from "./FollowButton";
import { ProfileCellarList } from "./ProfileCellarList";
import { PublicProfileHeader } from "./PublicProfileHeader";
import { SocialReviewCard } from "./SocialReviewCard";
import { TasteProfileCard } from "./TasteProfileCard";
import { usePublicProfileViewModel } from "./usePublicProfileViewModel";

export function PublicProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const userId = typeof id === "string" && id ? id : undefined;
  const vm = usePublicProfileViewModel(userId);
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const { profile } = vm;
  const openWine = (wineId: string) => router.push(createWineDetailRoute(wineId));

  if (!profile) {
    return (
      <View style={styles.screen}>
        <AppHeader title="" showBack backFallback={PROFILE_ROUTE} />
        <View style={styles.content}>
          {vm.isError ? (
            <QueryErrorState error={vm.error ?? {}} onRetry={vm.retry} />
          ) : (
            <>
              <Skeleton height={230} radius={radii.lg} />
              <Skeleton height={160} radius={radii.lg} />
            </>
          )}
        </View>
      </View>
    );
  }

  const action = vm.isOwn ? (
    <Button variant="outline" size="sm" fullWidth onPress={() => setEditOpen(true)} testID="edit-profile">
      {t("profile.editProfile")}
    </Button>
  ) : (
    <FollowButtonView
      name={profile.displayName}
      following={vm.follow.following}
      pending={vm.follow.pending}
      onPress={vm.follow.toggle}
      fullWidth
    />
  );

  return (
    <View style={styles.screen}>
      <AppHeader
        title={`@${profile.username}`}
        showBack
        backFallback={PROFILE_ROUTE}
        rightAction={
          vm.isOwn ? null : (
            <CommunityActions variant="menu" targetType="USER" targetId={profile.id} authorId={profile.id} />
          )
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<BrandRefreshControl refreshing={vm.isRefreshing} onRefresh={vm.refresh} />}
        showsVerticalScrollIndicator={false}
      >
        <PublicProfileHeader
          profile={profile}
          followersCount={vm.followersCount}
          action={action}
          onFollowersPress={() => router.push(createUserFollowersRoute(profile.id))}
          onFollowingPress={() => router.push(createUserFollowingRoute(profile.id))}
        />

        <TasteProfileCard
          wheel={profile.tasteWheel}
          traits={profile.tasteTraits}
          isOwn={vm.isOwn}
          editor={vm.tasteEditor}
          quizEntry={
            vm.isOwn
              ? { completed: vm.quizCompleted, onPress: () => router.push(TASTE_QUIZ_ROUTE as Href) }
              : null
          }
        />

        <View style={styles.tabs} accessibilityRole="radiogroup">
          {(["reviews", "cellar"] as const).map((key) => (
            <Chip
              key={key}
              label={t(`social.sections.${key}`)}
              selected={vm.section === key}
              role="radio"
              onPress={() => vm.setSection(key)}
            />
          ))}
        </View>

        {vm.section === "reviews" ? (
          <View style={styles.list}>
            {vm.reviews.isLoading ? (
              <Skeleton height={140} radius={radii.lg} />
            ) : vm.reviews.items.length === 0 ? (
              <Text style={styles.empty}>{t(vm.isOwn ? "social.noReviewsOwn" : "social.noReviews")}</Text>
            ) : (
              vm.reviews.items.map((review) => (
                <SocialReviewCard key={review.id} review={review} showReviewer={false} onWinePress={openWine} />
              ))
            )}
            {vm.reviews.hasMore ? (
              <Button variant="ghost" size="sm" loading={vm.reviews.isFetching} onPress={vm.reviews.loadMore}>
                {t("social.loadMore")}
              </Button>
            ) : null}
          </View>
        ) : vm.cellarLocked ? (
          <View style={[styles.card, styles.locked]} testID="cellar-locked">
            <Lock size={20} color={lightTokens.textTertiary} />
            <View style={styles.lockedCopy}>
              <Text style={styles.lockedTitle}>{t("social.cellarLockedTitle")}</Text>
              <Text style={styles.lockedText}>{t("social.cellarLockedBody", { name: profile.displayName })}</Text>
              {!vm.follow.following ? (
                <Text style={styles.lockedText}>{t("social.cellarLockedFollowersHint")}</Text>
              ) : null}
            </View>
          </View>
        ) : (
          <ProfileCellarList list={vm.cellar} onWinePress={openWine} />
        )}
      </ScrollView>
      {vm.isOwn ? (
        <EditProfileSheet
          visible={editOpen}
          user={user}
          onClose={() => setEditOpen(false)}
          onUpdated={vm.refresh}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: { paddingHorizontal: layout.screenHorizontalPadding, paddingTop: 12, gap: 16 },
  card: {
    gap: 12,
    padding: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  locked: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  lockedCopy: { flex: 1, gap: 4 },
  lockedTitle: { ...textStyles.labelLarge, color: lightTokens.textPrimary },
  lockedText: { ...textStyles.bodySmall, color: lightTokens.textSecondary, flexShrink: 1 },
  tabs: { flexDirection: "row", gap: 8 },
  list: { gap: 12 },
  empty: { ...textStyles.bodySmall, color: lightTokens.textTertiary, textAlign: "center", paddingVertical: 16 },
});
