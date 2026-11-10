import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

/**
 * Live system Reduce Motion setting.
 *
 * Starts from the value Reanimated reads synchronously at launch, so the first frame
 * already honours it, then follows every change the user makes while the app runs.
 */
export function useReduceMotionEnabled(): boolean {
  const enabledAtLaunch = useReducedMotion();
  const [enabled, setEnabled] = useState(enabledAtLaunch);

  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setEnabled);
    return () => subscription.remove();
  }, []);

  return enabled;
}
