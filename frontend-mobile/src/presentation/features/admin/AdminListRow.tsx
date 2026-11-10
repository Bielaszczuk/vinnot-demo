/**
 * AdminListRow — generic row for any admin list (wines, wineries, users, events, routes, reviews).
 */
import { StyleSheet, Text, View } from "react-native";
import { ChevronRight, MoreHorizontal } from "lucide-react-native";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { lightTokens, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

export interface AdminListRowAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface AdminListRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: { label: string; color: string; bg: string };
  onPress?: () => void;
  actions?: AdminListRowAction[];
  rightSlot?: React.ReactNode;
}

export function AdminListRow({
  title,
  subtitle,
  meta,
  badge,
  onPress,
  rightSlot,
}: AdminListRowProps) {
  return (
    <MotionPressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.row}
      accessibilityRole={onPress ? "button" : undefined}
    >
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          )}
        </View>
        {!!subtitle && (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
        {!!meta && (
          <Text numberOfLines={1} style={styles.meta}>
            {meta}
          </Text>
        )}
      </View>
      {rightSlot ?? (
        <View style={styles.affordance}>
          {onPress
            ? <ChevronRight size={18} color={wine[700]} />
            : <MoreHorizontal size={18} color={lightTokens.textTertiary} />}
        </View>
      )}
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: lightTokens.surfaceDefault,
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: lightTokens.borderDefault,
    shadowColor: lightTokens.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.025,
    shadowRadius: 6,
    elevation: 1,
  },
  body: { flex: 1, gap: 3 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  title: { ...textStyles.titleMedium, color: lightTokens.textPrimary, flex: 1 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  badgeText: { ...textStyles.labelSmall },
  subtitle: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  meta: { ...textStyles.caption, color: lightTokens.textDisabled },
  affordance: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: wine[50],
  },
});
