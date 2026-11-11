/**
 * PublicProfileHeader — avatar, name, current seal, @username, bio, counters and the
 * Follow / Edit profile action of a public profile.
 */
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react-native";
import type { PublicProfile } from "@/domain/social/social.types";
import { Avatar } from "@/presentation/components/ui/Atoms";
import { NameBadge } from "@/presentation/features/points/NameBadge";
import { useFormatters } from "@/presentation/hooks/ui/useFormatters";
import { lightTokens, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

interface PublicProfileHeaderProps {
  profile: PublicProfile;
  followersCount: number;
  action: ReactNode;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
}

function Counter({
  value,
  label,
  onPress,
  testID,
}: {
  value: ReactNode;
  label: string;
  onPress?: () => void;
  testID: string;
}) {
  return (
    <Pressable
      style={styles.counter}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : "text"}
      testID={testID}
    >
      <Text style={styles.counterValue}>{value}</Text>
      <Text style={styles.counterLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function PublicProfileHeader({
  profile,
  followersCount,
  action,
  onFollowersPress,
  onFollowingPress,
}: PublicProfileHeaderProps) {
  const { t } = useTranslation();
  const { formatNumber } = useFormatters();

  return (
    <View style={styles.container}>
      <View style={styles.identity}>
        <Avatar uri={profile.avatarUrl} name={profile.displayName} size={84} />
        <View style={styles.identityText}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={2}>
              {profile.displayName}
            </Text>
            <NameBadge tier={profile.tier} size="card" />
          </View>
          <Text style={styles.username}>@{profile.username}</Text>
          <View style={styles.pills}>
            {profile.followsYou ? <Text style={styles.pill}>{t("social.followsYou")}</Text> : null}
            {profile.affinityPercent != null ? (
              <Text style={[styles.pill, styles.affinity]}>
                {t("social.affinity", { percent: profile.affinityPercent })}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      <View style={styles.counters}>
        <Counter
          testID="counter-followers"
          value={formatNumber(followersCount)}
          label={t("social.counters.followers")}
          onPress={onFollowersPress}
        />
        <Counter
          testID="counter-following"
          value={formatNumber(profile.followingCount)}
          label={t("social.counters.following")}
          onPress={onFollowingPress}
        />
        <Counter testID="counter-reviews" value={formatNumber(profile.reviewsCount)} label={t("social.counters.reviews")} />
        <Counter
          testID="counter-cellar"
          value={
            profile.cellarCount == null ? (
              <Lock size={16} color={lightTokens.textTertiary} accessibilityLabel={t("social.cellarCountHidden")} />
            ) : (
              formatNumber(profile.cellarCount)
            )
          }
          label={t("social.counters.cellar")}
        />
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    padding: 18,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    backgroundColor: lightTokens.surfaceDefault,
  },
  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  identityText: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { ...textStyles.headingSmall, color: lightTokens.textPrimary, flexShrink: 1 },
  username: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  pill: {
    ...textStyles.caption,
    color: lightTokens.textSecondary,
    backgroundColor: lightTokens.bgSubtle,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  affinity: { color: wine[800], backgroundColor: wine[50] },
  bio: { ...textStyles.bodyMedium, color: lightTokens.textPrimary },
  counters: { flexDirection: "row", justifyContent: "space-between" },
  counter: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 4 },
  counterValue: { ...textStyles.titleMedium, color: lightTokens.textPrimary, minHeight: 22 },
  counterLabel: { ...textStyles.caption, color: lightTokens.textTertiary },
});
