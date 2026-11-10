import { useEffect } from "react";
import { Easing, useReducedMotion, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

const APPEAR_MS = 900;

/** Runs 0 -> 1 once when the view appears; already 1 with reduced motion, so nothing moves. */
export function useAppearProgress(durationMs = APPEAR_MS): SharedValue<number> {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) });
  }, [durationMs, progress, reduceMotion]);

  return progress;
}
