/**
 * TasteTraitSlider — one structure trait as a 0-100 slider while the member adjusts the own
 * palate: drag the marker or tap the track; the bar fills or empties under the finger.
 * The pan only takes over after a horizontal move, so a vertical swipe still scrolls the
 * profile. Screen readers get an adjustable control that steps by 5 and reads the level word.
 */
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View, type AccessibilityActionEvent, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { TasteTrait } from "@/domain/social/social.types";
import { clampTasteTraitValue } from "@/domain/social/socialRules";
import { useHaptics } from "@/presentation/hooks/ui";
import { editorial, radii } from "@/shared/theme/tokens";
import { vinnotColors } from "@/shared/theme/vinnotTheme";

/** Screen-reader step. */
export const TASTE_SLIDER_STEP = 5;
const THUMB_SIZE = 22;
const FOLLOW_MS = 90;
/** The pan starts after this horizontal move and gives way to a vertical one. */
const ACTIVATE_X = 8;
const FAIL_Y = 12;

interface TasteTraitSliderProps {
  trait: TasteTrait;
  /** Trait name, read as the control's label. */
  name: string;
  /** Level word of the current value, read as the control's value. */
  level: string;
  value: number;
  color: string;
  onChange: (value: number) => void;
}

export function TasteTraitSlider({ trait, name, level, value, color, onChange }: TasteTraitSliderProps) {
  const haptics = useHaptics();
  // Read by the gesture on the UI thread, so a new layout does not rebuild the gesture.
  const trackWidth = useSharedValue(0);
  const position = useSharedValue(value);
  // The gesture lives on the UI thread; it reaches the latest callbacks through these refs.
  const onChangeRef = useRef(onChange);
  const hapticsRef = useRef(haptics);
  useEffect(() => {
    onChangeRef.current = onChange;
    hapticsRef.current = haptics;
  });

  useEffect(() => {
    position.value = withTiming(value, { duration: FOLLOW_MS });
  }, [position, value]);

  const gesture = useMemo(() => {
    const move = (next: number) => onChangeRef.current(next);
    const release = () => hapticsRef.current.impact("light");
    // Until the track is measured a touch has no value to point at, so it is ignored.
    const moveTo = (x: number) => {
      "worklet";
      const width = trackWidth.value;
      if (width > 0) scheduleOnRN(move, Math.round(Math.min(Math.max(x / width, 0), 1) * 100));
    };
    const pan = Gesture.Pan()
      .activeOffsetX([-ACTIVATE_X, ACTIVATE_X])
      .failOffsetY([-FAIL_Y, FAIL_Y])
      .onStart((event) => moveTo(event.x))
      .onUpdate((event) => moveTo(event.x))
      .onEnd(() => scheduleOnRN(release))
      .withTestId(`taste-slider-pan-${trait}`);
    const tap = Gesture.Tap()
      .onEnd((event) => {
        moveTo(event.x);
        scheduleOnRN(release);
      })
      .withTestId(`taste-slider-tap-${trait}`);
    return Gesture.Race(pan, tap);
  }, [trait, trackWidth]);

  const fill = useAnimatedStyle(() => ({ width: `${position.value}%` }));
  const thumb = useAnimatedStyle(() => ({ left: `${position.value}%` }));

  const onLayout = (event: LayoutChangeEvent) => {
    trackWidth.value = event.nativeEvent.layout.width;
  };
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const step = event.nativeEvent.actionName === "increment" ? TASTE_SLIDER_STEP : -TASTE_SLIDER_STEP;
    onChange(clampTasteTraitValue(value + step));
  };

  return (
    <GestureDetector gesture={gesture}>
      <View
        testID={`taste-slider-${trait}`}
        style={styles.slider}
        onLayout={onLayout}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={name}
        accessibilityValue={{ min: 0, max: 100, now: value, text: level }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={onAccessibilityAction}
      >
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
        </View>
        <Animated.View pointerEvents="none" style={[styles.thumb, { borderColor: color }, thumb]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // Tall enough to hit comfortably; the visible track stays as thin as the read-only scale.
  slider: { height: 32, justifyContent: "center" },
  track: {
    height: 8,
    borderRadius: radii.full,
    backgroundColor: editorial.cream,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radii.full, opacity: 0.6 },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginLeft: -THUMB_SIZE / 2,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
    backgroundColor: vinnotColors.surface,
    shadowColor: vinnotColors.brandDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
});
