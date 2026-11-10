import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import {
  Keyboard,
  Platform,
  TextInput,
  type HostInstance,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

type Scrollable = { scrollTo: (options: { y: number; animated: boolean }) => void };
type Measurable = Pick<HostInstance, "measureInWindow">;

/**
 * Scrolls the focused field above the actual keyboard boundary, using its
 * measured window bounds. Shared by the sheet scroll and the auth layout.
 */
export function useFocusedFieldReveal<T extends Scrollable>({
  enabled = true,
  followNativeFocus = false,
  cover = null,
  keepTopVisible = false,
}: {
  enabled?: boolean;
  followNativeFocus?: boolean;
  /** Something pinned above the keyboard, such as a sheet footer, that also hides fields. */
  cover?: { current: Measurable | null } | null;
  /** Never scroll the top of a field taller than the visible area out of the scroll view. */
  keepTopVisible?: boolean;
} = {}) {
  const scroll = useRef<T | null>(null);
  const focused = useRef<Measurable | null>(null);
  const offset = useRef(0);
  const reveal = useCallback(() => {
    if (!enabled) return;
    const keyboardTop = Keyboard.metrics()?.screenY;
    if (keyboardTop === undefined) return;
    const field =
      focused.current ??
      (followNativeFocus ? (TextInput.State.currentlyFocusedInput() ?? null) : null);
    if (!field) return;
    visibleBottom(cover?.current ?? null, keyboardTop, (bottom) =>
      field.measureInWindow((_x, y, _width, height) => {
        const overflow = y + height + 20 - bottom;
        if (overflow <= 0) return;
        const scrollTo = (room: number) => {
          const by = Math.min(overflow, room);
          if (by > 0) scroll.current?.scrollTo({ y: offset.current + by, animated: true });
        };
        const viewport = scroll.current as Partial<Measurable> | null;
        if (keepTopVisible && typeof viewport?.measureInWindow === "function")
          viewport.measureInWindow((_vx, top) => scrollTo(y - top - 8));
        else scrollTo(overflow);
      }),
    );
  }, [enabled, followNativeFocus, cover, keepTopVisible]);
  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", reveal);
    return () => subscription.remove();
  }, [reveal]);
  const focus = useCallback(
    (input: Measurable | null) => {
      focused.current = input;
      reveal();
    },
    [reveal],
  );
  const trackScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
  }, []);
  return { scroll, focus, reveal, trackScroll };
}

/** The lowest visible point: the keyboard top, or a laid-out cover above it. */
function visibleBottom(cover: Measurable | null, keyboardTop: number, next: (bottom: number) => void) {
  if (!cover) return next(keyboardTop);
  cover.measureInWindow((_x, y) => next(y > 0 ? Math.min(y, keyboardTop) : keyboardTop));
}

/**
 * Edge-to-edge Android does not resize the window for the docked keyboard, so
 * a scroll keeps its height. Returns the keyboard height while it is docked on
 * Android (0 elsewhere) so the scroll can reserve room to reveal low fields.
 */
export function useAndroidKeyboardSpace() {
  const store = useMemo(() => {
    let height = 0;
    return {
      subscribe(onChange: () => void) {
        if (Platform.OS !== "android") return () => undefined;
        const shown = Keyboard.addListener("keyboardDidShow", () => {
          height = Keyboard.metrics()?.height ?? 0;
          onChange();
        });
        const hidden = Keyboard.addListener("keyboardDidHide", () => {
          height = 0;
          onChange();
        });
        return () => {
          shown.remove();
          hidden.remove();
        };
      },
      read: () => height,
    };
  }, []);
  return useSyncExternalStore(store.subscribe, store.read, store.read);
}
