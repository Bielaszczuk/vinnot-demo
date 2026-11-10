import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { nextReplayDelay } from "./sealMotion";

/**
 * List seals play once when they appear, then again every 8–16 s while they are on
 * screen and the app is active. Off-screen or backgrounded seals skip the replay.
 */
export function useListReplay(
  enabled: boolean,
  isOnScreen: () => Promise<boolean>,
  onBurst: () => void,
  random: () => number = Math.random,
): void {
  const latest = useRef({ isOnScreen, onBurst, random });
  latest.current = { isOnScreen, onBurst, random };

  useEffect(() => {
    if (!enabled) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const schedule = () => {
      timer = setTimeout(() => {
        if (AppState.currentState === "background" || AppState.currentState === "inactive") return schedule();
        void latest.current.isOnScreen().then((visible) => {
          if (!alive) return;
          if (visible) latest.current.onBurst();
          schedule();
        });
      }, nextReplayDelay(latest.current.random()));
    };
    latest.current.onBurst();
    schedule();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
}
