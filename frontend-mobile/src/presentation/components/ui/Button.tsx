/**
 * Button — Vinnot Mobile Design System
 */
import { type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, ViewStyle, TextStyle, Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { hapticsService } from "@/application/services/haptics.service";
import { motionPresets } from "@/shared/theme/motion";
import { shadows } from "@/shared/theme/shadows";
import { radii } from "@/shared/theme/tokens";
import { fontSizes, lineHeights, textStyles } from "@/shared/theme/typography";
import { vinnotColors } from "@/shared/theme/vinnotTheme";

/** A small button is 36 pt tall; the slop brings its touch target to 44 pt. */
const SMALL_HIT_SLOP = { top: 4, bottom: 4, left: 0, right: 0 };

/** Layout keys size and place the whole button, so they belong on the outer wrapper, not the pressable surface. */
const LAYOUT_KEYS = new Set([
  "flex", "flexGrow", "flexShrink", "flexBasis", "alignSelf",
  "width", "minWidth", "maxWidth",
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight",
  "marginHorizontal", "marginVertical", "marginStart", "marginEnd",
  "position", "top", "bottom", "left", "right", "zIndex",
]);

function splitLayout(style: ViewStyle | undefined): { layout: ViewStyle; surface: ViewStyle } {
  const layout: Record<string, unknown> = {};
  const surface: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(StyleSheet.flatten(style) ?? {})) {
    (LAYOUT_KEYS.has(key) ? layout : surface)[key] = value;
  }
  return { layout: layout as ViewStyle, surface: surface as ViewStyle };
}

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children: ReactNode;
  testID?: string;
  accessibilityLabel?: string;
}

export function Button({
  onPress,
  onLongPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  children,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(
      motionPresets.buttonPress.scaleDown,
      { duration: motionPresets.buttonPress.duration },
    );
    hapticsService.impact();
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: motionPresets.buttonPress.duration });
  };

  const { layout, surface } = splitLayout(style);
  const wrapperStyle = [animatedStyle, fullWidth && styles.fullWidth, layout];
  const isDisabled = disabled || loading;
  const isPrimary = variant === "primary";
  const hitSlop = size === "sm" ? SMALL_HIT_SLOP : undefined;

  const sizeStyle = styles[`size_${size}` as keyof typeof styles] as ViewStyle;
  const variantStyle = isPrimary ? undefined : styles[`variant_${variant}` as keyof typeof styles] as ViewStyle;
  const containerStyle = [
    styles.base,
    sizeStyle,
    variantStyle,
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    !isPrimary && surface,
  ];
  const labelStyle = [
    styles.label,
    styles[`label_${size}` as keyof typeof styles] as TextStyle,
    styles[`label_${variant}` as keyof typeof styles] as TextStyle,
    isDisabled && styles.labelDisabled,
    textStyle,
  ];

  const content = loading ? (
    <ActivityIndicator
      size="small"
      color={
        variant === "danger"
          ? vinnotColors.white
          : variant === "outline" || variant === "ghost"
            ? vinnotColors.brand
            : variant === "secondary"
              ? vinnotColors.ink
              : vinnotColors.white
      }
    />
  ) : (
    <>
      {leftIcon && <>{leftIcon}</>}
      {/* One line on every platform: a wrapped label made some buttons taller than their row on narrow Android screens. */}
      <Text style={labelStyle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{children}</Text>
      {rightIcon && <>{rightIcon}</>}
    </>
  );

  if (isPrimary) {
    return (
      <Animated.View style={wrapperStyle}>
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          hitSlop={hitSlop}
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
          accessibilityState={{ disabled: isDisabled, busy: loading }}
          style={[
            styles.base,
            styles.primarySurface,
            sizeStyle,
            fullWidth && styles.fullWidth,
            isDisabled && styles.disabled,
            surface,
          ]}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={wrapperStyle}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        hitSlop={hitSlop}
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
        style={containerStyle}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    gap: 8,
    overflow: "hidden",
  },
  fullWidth: { width: "100%" } as ViewStyle,
  disabled: { opacity: 0.45 },
  primarySurface: {
    borderWidth: 1,
    borderColor: vinnotColors.brand,
    backgroundColor: vinnotColors.brand,
    ...shadows.sm,
  },

  size_sm: { minHeight: 36, paddingHorizontal: 14, paddingVertical: 8 },
  size_md: { minHeight: 48, paddingHorizontal: 20, paddingVertical: 12 },
  size_lg: { minHeight: 56, paddingHorizontal: 28, paddingVertical: 14 },

  variant_secondary: {
    backgroundColor: vinnotColors.surface,
    borderWidth: 1,
    borderColor: vinnotColors.border,
    ...shadows.sm,
  },
  variant_outline: {
    backgroundColor: vinnotColors.surface,
    borderWidth: 1,
    borderColor: vinnotColors.brand,
  },
  variant_ghost: { backgroundColor: vinnotColors.brandSoft },
  variant_danger: { backgroundColor: vinnotColors.danger, ...shadows.sm },

  // Shrinks beside an icon; Android's extra font padding would otherwise make the button taller than its size.
  label: { textAlign: "center", flexShrink: 1, includeFontPadding: false, textAlignVertical: "center" },
  label_sm: textStyles.buttonSmall,
  label_md: textStyles.button,
  label_lg: { ...textStyles.button, fontSize: fontSizes.md, lineHeight: fontSizes.md * lineHeights.normal },
  label_primary: { color: vinnotColors.white },
  label_secondary: { color: vinnotColors.ink },
  label_outline: { color: vinnotColors.brand },
  label_ghost: { color: vinnotColors.brand },
  label_danger: { color: vinnotColors.white },
  labelDisabled: {},
});
