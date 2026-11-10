/**
 * Badge, Chip, TagPill, Avatar — atomic UI components.
 * Rating glasses live in `features/wine/rating/RatingGlasses` (they follow the wine type).
 */
import { Image, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import {
  editorial,
  lightTokens,
  radii,
  systemColors,
  wine,
} from "@/shared/theme/tokens";
import { fontFamilies, textStyles } from "@/shared/theme/typography";
import { MotionPressable } from "./MotionPressable";

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "brand";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const badgeBg: Record<BadgeVariant, string> = {
  default: lightTokens.bgMuted,
  success: systemColors.successLight,
  warning: systemColors.warningLight,
  danger: systemColors.dangerLight,
  info: systemColors.infoLight,
  brand: lightTokens.brandSecondary,
};

const badgeFg: Record<BadgeVariant, string> = {
  default: lightTokens.textSecondary,
  success: systemColors.successText,
  warning: systemColors.warningText,
  danger: systemColors.dangerText,
  info: systemColors.infoText,
  brand: lightTokens.brandPrimary,
};

export function Badge({ label, variant = "default", style }: BadgeProps) {
  return (
    <View style={[badgeStyles.base, { backgroundColor: badgeBg[variant] }, style]}>
      <Text style={[badgeStyles.label, { color: badgeFg[variant] }]}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  label: { ...textStyles.labelSmall },
});

// ─── Chip ─────────────────────────────────────────────────────────────────────
interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** `radio` for one choice in a group (reasons, statuses); `button` for filters that toggle. */
  role?: "button" | "radio";
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

/** Chips are 34 pt tall; the slop brings their touch target to 44 pt. */
const CHIP_HIT_SLOP = { top: 5, bottom: 5, left: 2, right: 2 };

export function Chip({ label, selected, onPress, disabled, role = "button", style, labelStyle }: ChipProps) {
  const bg = selected ? lightTokens.brandPrimary : lightTokens.surfaceRaised;
  const fg = selected ? lightTokens.textInverted : lightTokens.textSecondary;
  const border = selected ? lightTokens.brandPrimary : lightTokens.borderStrong;
  const baseStyle = [
    chipStyles.base,
    { backgroundColor: bg, borderColor: border },
    selected && chipStyles.selected,
    disabled && chipStyles.disabled,
    style,
  ];

  if (onPress) {
    return (
      <MotionPressable
        onPress={onPress}
        disabled={disabled}
        hitSlop={CHIP_HIT_SLOP}
        style={baseStyle}
        accessibilityRole={role}
        accessibilityLabel={label}
        accessibilityState={
          role === "radio" ? { checked: !!selected, disabled: !!disabled } : { selected: !!selected, disabled: !!disabled }
        }
      >
        <Text style={[chipStyles.label, { color: fg }, labelStyle]}>{label}</Text>
      </MotionPressable>
    );
  }

  return (
    <View style={baseStyle} accessibilityState={{ selected: !!selected, disabled: !!disabled }}>
      <Text style={[chipStyles.label, { color: fg }, labelStyle]}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  selected: {
    shadowColor: lightTokens.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },
  disabled: { opacity: 0.45 },
  label: { ...textStyles.labelMedium },
});

// ─── TagPill ──────────────────────────────────────────────────────────────────
interface TagPillProps {
  label: string;
  color?: string;
  textColor?: string;
}

export function TagPill({
  label,
  color = wine[50],
  textColor = editorial.brand,
}: TagPillProps) {
  return (
    <View style={[tagStyles.base, { backgroundColor: color }]}>
      <Text style={[tagStyles.label, { color: textColor }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const tagStyles = StyleSheet.create({
  base: {
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  label: { ...textStyles.overline },
});

// ─── Avatar ───────────────────────────────────────────────────────────────────
interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ uri, name = "?", size = 40, style }: AvatarProps) {
  const { t } = useTranslation();
  const initials = name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={[
        avatarStyles.base,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          accessibilityLabel={t("common.avatarOf", { name })}
        />
      ) : (
        <Text style={[avatarStyles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
      )}
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  base: {
    backgroundColor: wine[200],
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    color: wine[800],
    fontFamily: fontFamilies.semibold,
  },
});
