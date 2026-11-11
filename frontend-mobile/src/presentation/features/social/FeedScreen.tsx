/**
 * FeedScreen — every new review from the people the user follows, newest first
 * (Home › «De gente que seguís» › «Ver todo»).
 */
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/presentation/components/layout";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useFeed } from "@/presentation/hooks/queries/social";
import { createUserProfileRoute } from "@/presentation/navigation/discoveryNavigation";
import { createWineDetailRoute } from "@/presentation/navigation/wineNavigation";
import { layout, lightTokens, radii } from "@/shared/theme/tokens";
import { SocialReviewCard } from "./SocialReviewCard";

export function FeedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const feed = useFeed(isAuthenticated);

  return (
    <View style={styles.screen}>
      <AppHeader title={t("social.feedTitle")} showBack />
      {feed.isLoading ? (
        <View style={styles.content}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} height={150} radius={radii.lg} />
          ))}
        </View>
      ) : feed.isError && feed.items.length === 0 ? (
        <View style={styles.content}>
          <QueryErrorState error={feed.error ?? {}} onRetry={feed.refresh} />
        </View>
      ) : (
        <FlatList
          data={feed.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          onEndReached={feed.loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <BrandRefreshControl refreshing={feed.isFetching && feed.items.length > 0} onRefresh={feed.refresh} />
          }
          ListEmptyComponent={
            <EmptyState
              illustration="noReviews"
              title={t("social.feedEmptyTitle")}
              description={t("social.feedEmptyBody")}
            />
          }
          renderItem={({ item }) => (
            <SocialReviewCard
              review={item}
              onUserPress={(userId) => router.push(createUserProfileRoute(userId))}
              onWinePress={(wineId) => router.push(createWineDetailRoute(wineId))}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: { paddingHorizontal: layout.screenHorizontalPadding, paddingTop: 12, gap: 12 },
});
