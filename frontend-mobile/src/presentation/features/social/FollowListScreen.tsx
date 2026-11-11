/**
 * Followers / following of a user (/users/{id}/followers and /following): each row opens
 * the person's profile and carries a Follow button, except the viewer's own row.
 */
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { FollowUser } from "@/domain/social/social.types";
import { AppHeader } from "@/presentation/components/layout";
import { Avatar } from "@/presentation/components/ui/Atoms";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { NameBadge } from "@/presentation/features/points/NameBadge";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useFollowers, useFollowing } from "@/presentation/hooks/queries/social";
import { createUserProfileRoute } from "@/presentation/navigation/discoveryNavigation";
import { layout, lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { FollowButton } from "./FollowButton";

type FollowListKind = "followers" | "following";

function FollowRow({ person, isSelf, onOpen }: { person: FollowUser; isSelf: boolean; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.person}
        onPress={onOpen}
        accessibilityRole="link"
        accessibilityLabel={t("social.openProfileA11y", { name: person.displayName })}
      >
        <Avatar uri={person.avatarUrl} name={person.displayName} size={44} />
        <View style={styles.personText}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {person.displayName}
            </Text>
            <NameBadge tier={person.tier} />
          </View>
          <Text style={styles.username} numberOfLines={1}>
            @{person.username}
          </Text>
        </View>
      </Pressable>
      {isSelf ? null : <FollowButton userId={person.id} name={person.displayName} following={person.following} />}
    </View>
  );
}

function FollowListScreen({ kind }: { kind: FollowListKind }) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const userId = typeof id === "string" && id ? id : undefined;
  const followers = useFollowers(kind === "followers" ? userId : undefined);
  const following = useFollowing(kind === "following" ? userId : undefined);
  const list = kind === "followers" ? followers : following;
  const title = t(kind === "followers" ? "social.followersTitle" : "social.followingTitle");

  return (
    <View style={styles.screen}>
      <AppHeader title={title} showBack />
      {list.isLoading ? (
        <View style={styles.content}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={64} radius={radii.lg} />
          ))}
        </View>
      ) : list.isError && list.items.length === 0 ? (
        <View style={styles.content}>
          <QueryErrorState error={list.error ?? {}} onRetry={list.refresh} />
        </View>
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<BrandRefreshControl refreshing={list.isFetching && list.items.length > 0} onRefresh={list.refresh} />}
          ListEmptyComponent={
            <EmptyState
              illustration="community"
              title={t(kind === "followers" ? "social.followersEmpty" : "social.followingEmpty")}
            />
          }
          renderItem={({ item }) => (
            <FollowRow
              person={item}
              isSelf={item.id === user?.id}
              onOpen={() => router.push(createUserProfileRoute(item.id))}
            />
          )}
        />
      )}
    </View>
  );
}

export function FollowersScreen() {
  return <FollowListScreen kind="followers" />;
}

export function FollowingScreen() {
  return <FollowListScreen kind="following" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightTokens.bgBase },
  content: { paddingHorizontal: layout.screenHorizontalPadding, paddingTop: 12, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  person: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  personText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { ...textStyles.labelLarge, color: lightTokens.textPrimary, flexShrink: 1 },
  username: { ...textStyles.caption, color: lightTokens.textTertiary },
});
