import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { editorial, lightTokens, radii, systemColors, wine } from "@/shared/theme/tokens";
import { textStyles, fontFamilies } from "@/shared/theme/typography";
import type { AdminUser } from "@/domain/admin/admin.types";
import { NameBadge } from "@/presentation/features/points/NameBadge";

function statusBadge(user: AdminUser) {
  if (user.locked) {
    return {
      labelKey: "admin.users.statusLabels.locked",
      color: systemColors.dangerText,
      bg: systemColors.dangerLight,
      dot: systemColors.danger,
    };
  }
  if (!user.enabled)
    return {
      labelKey: "admin.users.statusLabels.disabled",
      color: lightTokens.textSecondary,
      bg: lightTokens.bgSubtle,
      dot: lightTokens.textDisabled,
    };
  return {
    labelKey: "admin.users.statusLabels.active",
    color: systemColors.successText,
    bg: systemColors.successLight,
    dot: systemColors.success,
  };
}

export function AdminUserRow({ user, onPress }: { user: AdminUser; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const badge = statusBadge(user);
  const lastLogin = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleDateString(i18n.resolvedLanguage ?? i18n.language, {
        day: "numeric",
        month: "short",
      })
    : t("admin.users.never");

  return (
    <MotionPressable onPress={onPress} style={rowStyles.card}>
      <View style={rowStyles.avatar}>
        <Text style={rowStyles.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={rowStyles.body}>
        <View style={rowStyles.topRow}>
          <View style={rowStyles.nameRow}>
            <Text numberOfLines={1} style={rowStyles.username}>
              {user.username}
            </Text>
            <NameBadge tier={user.badgeTier} />
          </View>
          <View style={[rowStyles.badge, { backgroundColor: badge.bg }]}>
            <View style={[rowStyles.dot, { backgroundColor: badge.dot }]} />
            <Text style={[rowStyles.badgeText, { color: badge.color }]}>{t(badge.labelKey)}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={rowStyles.email}>
          {user.email}
        </Text>
        <View style={rowStyles.metaRow}>
          <Text style={rowStyles.roles}>
            {user.roles
              .slice(0, 2)
              .map((role) => t(`roles.${role}`, { defaultValue: role }))
              .join(", ")}
          </Text>
          <Text style={rowStyles.sep}>·</Text>
          <Text style={rowStyles.lastLogin}>{lastLogin}</Text>
          <Text style={rowStyles.sep}>·</Text>
          <Text style={rowStyles.lastLogin}>{t("points.pointsCount", { count: user.points })}</Text>
        </View>
      </View>
    </MotionPressable>
  );
}

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: lightTokens.surfaceDefault,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: wine[50],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: wine[200],
  },
  avatarText: { ...textStyles.titleMedium, color: editorial.brand },
  body: { flex: 1, gap: 2 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  username: { flexShrink: 1, ...textStyles.titleSmall, color: lightTokens.textPrimary },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { ...textStyles.caption, fontFamily: fontFamilies.semibold },
  email: { ...textStyles.caption, color: lightTokens.textTertiary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  roles: { ...textStyles.caption, color: lightTokens.textDisabled },
  sep: { ...textStyles.caption, color: lightTokens.textDisabled },
  lastLogin: { ...textStyles.caption, color: lightTokens.textDisabled },
});
