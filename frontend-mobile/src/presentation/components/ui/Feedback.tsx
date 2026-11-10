/**
 * Skeleton — animated shimmer placeholder (static under reduced motion).
 * Spinner — branded loading indicator.
 * EmptyState — empty list / zero-data screen, with an optional watercolor illustration.
 */
import { useEffect, useRef } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { illustrations } from "@/shared/illustrations";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { motionPresets } from "@/shared/theme/motion";
import { Button } from "./Button";
import { useImageTransition } from "./motion/reducedMotion";

// ─── Skeleton ─────────────────────────────────────────────────────────────────
interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, radius = radii.sm, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || reduced) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, {
            toValue: 1,
            duration: motionPresets.skeleton.duration / 2,
            useNativeDriver: false,
          }),
          Animated.timing(shimmer, {
            toValue: 0,
            duration: motionPresets.skeleton.duration / 2,
            useNativeDriver: false,
          }),
        ]),
      );
      animation.start();
    });
    return () => {
      active = false;
      animation?.stop();
    };
  }, [shimmer]);

  const backgroundColor = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [lightTokens.bgMuted, lightTokens.bgSubtle],
  });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor },
        style,
      ]}
    />
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  style?: ViewStyle;
}

const spinnerSizes = { sm: "small", md: "large", lg: "large" } as const;

export function Spinner({ size = "md", color = lightTokens.brandPrimary, style }: SpinnerProps) {
  return (
    <View style={[spinnerStyles.container, style]}>
      <ActivityIndicator size={spinnerSizes[size]} color={color} />
    </View>
  );
}

const spinnerStyles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
});

// ─── EmptyState ───────────────────────────────────────────────────────────────
export type IllustrationKey = keyof typeof illustrations;

interface EmptyStateProps {
  title: string;
  description?: string;
  /** A watercolor illustration from `shared/illustrations`; shown instead of the icon well. */
  illustration?: IllustrationKey;
  icon?: React.ReactNode;
  action?: { label: string; onPress: () => void; variant?: "primary" | "outline" };
  /** A lighter second way out, shown under the main action. */
  secondaryAction?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export function EmptyState({
  title,
  description,
  illustration,
  icon,
  action,
  secondaryAction,
  style,
}: EmptyStateProps) {
  const illustrationTransition = useImageTransition(180);
  return (
    <View style={[emptyStyles.container, style]}>
      {illustration ? (
        <Image
          source={illustrations[illustration]}
          contentFit="contain"
          style={emptyStyles.illustration}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          transition={illustrationTransition}
        />
      ) : (
        icon && <View style={emptyStyles.icon}>{icon}</View>
      )}
      <Text accessibilityRole="header" style={emptyStyles.title}>{title}</Text>
      {description && <Text style={emptyStyles.description}>{description}</Text>}
      {action && (
        <Button
          variant={action.variant ?? "outline"}
          onPress={action.onPress}
          style={emptyStyles.action}
        >
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <Button variant="ghost" onPress={secondaryAction.onPress}>
          {secondaryAction.label}
        </Button>
      )}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  illustration: {
    width: "100%",
    maxWidth: 320,
    height: 180,
    marginBottom: 4,
  },
  icon: {
    marginBottom: 4,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    backgroundColor: lightTokens.brandSecondary,
  },
  title: {
    ...textStyles.headingSmall,
    color: lightTokens.textPrimary,
    textAlign: "center",
  },
  description: {
    ...textStyles.bodyMedium,
    color: lightTokens.textSecondary,
    textAlign: "center",
    maxWidth: 360,
  },
  action: {
    marginTop: 16,
  },
});
