/**
 * UserBadge — the user's wax seal with its tier motion (S7).
 * `loop` plays forever (profile, celebration, Tus puntos); `list` plays once when it
 * appears and again every 8–16 s while on screen. Reduced motion shows a still seal
 * with a fixed highlight.
 */
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dimensions, Pressable, StyleSheet, View, type GestureResponderEvent, type ViewInstance } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import type { BadgeTier } from "@/domain/points/badgeTiers";
import { SealCanvas, type SealPointer, type SealTiming } from "./SealCanvas";
import { LIST_BURST_SECONDS, SPARKLE_MIN_SIZE } from "./sealMotion";
import { useListReplay } from "./useListReplay";

export const BADGE_SIZES = { list: 20, card: 64, profile: 104 } as const;
export type BadgeSize = keyof typeof BADGE_SIZES | number;
export type BadgeMode = "loop" | "list";

/** Seconds of profile clock per animation leg; spins stay continuous within it. */
const LOOP_SPAN = 3600;
const TILT_DEGREES = 12;
const REST_POINTER: SealPointer = { x: 0.5, y: 0.4, active: false };

interface UserBadgeProps {
  /** Null or missing hides the badge (no points yet, locked or inactive user). */
  tier: BadgeTier | null | undefined;
  size?: BadgeSize;
  mode?: BadgeMode;
  /** The finger moves the foil and tilts the seal slightly (profile, celebration). */
  interactive?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

function measureOnScreen(view: ViewInstance | null): Promise<boolean> {
  return new Promise((resolve) => {
    if (!view?.measureInWindow) return resolve(false);
    view.measureInWindow((x, y, width, height) => {
      const screen = Dimensions.get("window");
      resolve(width > 0 && x + width > 0 && y + height > 0 && x < screen.width && y < screen.height);
    });
  });
}

export function UserBadge({
  tier,
  size = "list",
  mode = "list",
  interactive = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: UserBadgeProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const pixels = typeof size === "number" ? size : BADGE_SIZES[size];
  const loop = mode === "loop";
  const clock = useSharedValue(loop ? 0 : LIST_BURST_SECONDS * 100);
  const burstStart = useSharedValue(0);
  const pointer = useSharedValue<SealPointer>(REST_POINTER);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const view = useRef<ViewInstance>(null);
  const animated = !!tier && !reduceMotion;

  useEffect(() => {
    if (!animated || !loop) return undefined;
    clock.value = 0;
    clock.value = withRepeat(withTiming(LOOP_SPAN, { duration: LOOP_SPAN * 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(clock);
  }, [animated, clock, loop]);

  const burst = useCallback(() => {
    burstStart.value = clock.value;
    clock.value = withTiming(clock.value + LIST_BURST_SECONDS, {
      duration: LIST_BURST_SECONDS * 1000,
      easing: Easing.linear,
    });
  }, [burstStart, clock]);
  const isOnScreen = useCallback(() => measureOnScreen(view.current), []);
  useListReplay(animated && !loop, isOnScreen, burst);

  const follow = (event: GestureResponderEvent) => {
    const x = Math.min(1, Math.max(0, event.nativeEvent.locationX / pixels));
    const y = Math.min(1, Math.max(0, event.nativeEvent.locationY / pixels));
    pointer.value = { x, y, active: true };
    tiltX.value = withTiming((0.5 - y) * TILT_DEGREES, { duration: 250 });
    tiltY.value = withTiming((x - 0.5) * TILT_DEGREES, { duration: 250 });
  };
  const release = () => {
    pointer.value = REST_POINTER;
    tiltX.value = withTiming(0, { duration: 250 });
    tiltY.value = withTiming(0, { duration: 250 });
  };
  // A 3D transform makes iOS rasterize the view with antialiased edges, which draws a faint
  // box where the glow crosses its bounds; at rest the seal stays flat.
  const tiltStyle = useAnimatedStyle(() => ({
    transform: tiltX.value === 0 && tiltY.value === 0
      ? []
      : [{ perspective: 600 }, { rotateX: `${tiltX.value}deg` }, { rotateY: `${tiltY.value}deg` }],
  }));

  if (!tier) return null;

  const timing: SealTiming = { clock, burstStart, loop, still: reduceMotion };
  const label = accessibilityLabel ?? t(`points.tiers.${tier}`);
  const touch = interactive && !reduceMotion
    ? { onTouchStart: follow, onTouchMove: follow, onTouchEnd: release, onTouchCancel: release }
    : {};
  const seal = (
    <Animated.View style={[{ width: pixels, height: pixels }, tiltStyle]} {...touch}>
      <SealCanvas tier={tier} size={pixels} timing={timing} pointer={pointer} sparkles={pixels >= SPARKLE_MIN_SIZE} />
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable ref={view} onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}
        accessibilityHint={accessibilityHint} testID={testID} style={styles.frame}>
        {seal}
      </Pressable>
    );
  }
  return (
    <View ref={view} accessible accessibilityRole="image" accessibilityLabel={label} testID={testID} style={styles.frame}>
      {seal}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "visible" },
});
