/**
 * FocusAwareStatusBar — a status bar style for one screen. Tab screens stay
 * mounted, so the style is mounted only while the screen is focused; when it
 * blurs, the root `StatusBar style="dark"` applies again.
 */
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { StatusBar, type StatusBarStyle } from "expo-status-bar";

export function FocusAwareStatusBar({ style }: { style: StatusBarStyle }) {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused ? <StatusBar style={style} /> : null;
}
