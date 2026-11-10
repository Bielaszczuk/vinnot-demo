import { forwardRef, useCallback, type ForwardedRef } from "react";
import {
  Platform,
  ScrollView,
  View,
  type ScrollViewInstance,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from "react-native";
import { useAndroidKeyboardSpace, useFocusedFieldReveal } from "./useFocusedFieldReveal";

/**
 * Screen scroll that keeps the focused field above the keyboard on both platforms.
 *
 * iOS insets the scroll natively (`automaticallyAdjustKeyboardInsets`). Edge-to-edge
 * Android does not resize the window for the docked keyboard, so the scroll reserves
 * the keyboard height after its content. On both, the shared reveal scrolls the
 * focused field only when it is still below the keyboard top, which also keeps a
 * growing multiline field visible.
 */
export const KeyboardAwareScrollView = forwardRef(function KeyboardAwareScrollView(
  {
    children,
    onScroll,
    onLayout,
    onContentSizeChange,
    automaticallyAdjustKeyboardInsets = Platform.OS === "ios",
    keyboardShouldPersistTaps = "handled",
    scrollEventThrottle = 16,
    ...props
  }: ScrollViewProps,
  ref: ForwardedRef<ScrollViewInstance>,
) {
  const { scroll, reveal, trackScroll } = useFocusedFieldReveal<ScrollViewInstance>({ followNativeFocus: true });
  const keyboardSpace = useAndroidKeyboardSpace();
  const setRef = useCallback(
    (instance: ScrollViewInstance | null) => {
      scroll.current = instance;
      if (typeof ref === "function") ref(instance);
      else if (ref) ref.current = instance;
    },
    [ref, scroll],
  );
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      trackScroll(event);
      onScroll?.(event);
    },
    [onScroll, trackScroll],
  );
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onLayout?.(event);
      reveal();
    },
    [onLayout, reveal],
  );
  const handleContentSizeChange = useCallback(
    (width: number, height: number) => {
      onContentSizeChange?.(width, height);
      reveal();
    },
    [onContentSizeChange, reveal],
  );

  return (
    <ScrollView
      {...props}
      ref={setRef}
      onScroll={handleScroll}
      onLayout={handleLayout}
      onContentSizeChange={handleContentSizeChange}
      scrollEventThrottle={scrollEventThrottle}
      automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
      {children}
      {keyboardSpace > 0 && <View testID="keyboard-space" style={{ height: keyboardSpace }} />}
    </ScrollView>
  );
});
