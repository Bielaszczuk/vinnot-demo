import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  useContext,
} from "react";
import {
  BackHandler,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomSheetFooter,
  BottomSheetModal as NativeBottomSheetModal,
  BottomSheetScrollView as NativeBottomSheetScrollView,
  BottomSheetView as NativeBottomSheetView,
  BottomSheetHandle,
  BottomSheetModalProvider,
  type BottomSheetFooterProps,
  type BottomSheetScrollViewMethods,
} from "@gorhom/bottom-sheet";
import { ModalScreenToastHost } from "@/presentation/providers/ToastProvider";
import { lightTokens } from "@/shared/theme/tokens";
import { BackButton } from "./BackButton";
import { SheetInputContext, SheetFieldFocusContext, SheetFooterContext, type SheetMeasurable } from "./SheetInputContext";
import { useAndroidKeyboardSpace, useFocusedFieldReveal } from "./useFocusedFieldReveal";

export { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
export type BottomSheetModal = NativeBottomSheetModal;

/** Smallest gap kept between a sheet's last content and the home indicator. */
const HOME_INDICATOR_GAP = 16;

/**
 * Sheets reach the screen's bottom edge, so their content keeps its own bottom
 * padding and adds the safe-area inset to stay above the home indicator.
 */
function useSafeBottomPadding(style: unknown) {
  const { bottom } = useSafeAreaInsets();
  // Plain and Reanimated styles flatten alike; only their bottom padding is read.
  const flat = StyleSheet.flatten(style as StyleProp<ViewStyle>) ?? {};
  const own = flat.paddingBottom ?? flat.paddingVertical ?? flat.padding;
  const gap = typeof own === "number" ? Math.max(own, HOME_INDICATOR_GAP) : HOME_INDICATOR_GAP;
  return { paddingBottom: bottom + gap };
}

/** A plain sheet body that keeps its content above the home indicator. */
export function BottomSheetView({ style, ...props }: ComponentProps<typeof NativeBottomSheetView>) {
  const padding = useSafeBottomPadding(style);
  return <NativeBottomSheetView {...props} style={[style, padding]} />;
}

/**
 * Sheets and toasts normally render in the app-level hosts. A screen shown inside a
 * native modal sits above them, so it gets hosts of its own to keep both visible.
 * The toast host wraps the sheet host so sheets inside the modal toast there too.
 */
export function ModalScreenSheetHost({
  inModal,
  children,
}: {
  inModal: boolean;
  children: ReactNode;
}) {
  return inModal ? (
    <ModalScreenToastHost inModal>
      <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
    </ModalScreenToastHost>
  ) : (
    <>{children}</>
  );
}

/**
 * Actions pinned to the bottom of a form sheet (pass it through `footerComponent`). Gorhom
 * keeps the footer above the keyboard; it adds the home-indicator inset itself.
 */
export function BottomSheetStickyFooter({
  children,
  style,
  ...props
}: BottomSheetFooterProps & { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { bottom } = useSafeAreaInsets();
  const slot = useContext(SheetFooterContext);
  return (
    <BottomSheetFooter {...props}>
      <View
        ref={(view) => {
          if (slot) slot.current = view;
        }}
        style={[styles.footer, { paddingBottom: bottom + 12 }, style]}
      >
        {children}
      </View>
    </BottomSheetFooter>
  );
}

/** Reveal the focused field after the native keyboard and sheet settle. */
export const BottomSheetScrollView = forwardRef<
  BottomSheetScrollViewMethods,
  ComponentProps<typeof NativeBottomSheetScrollView>
>(function BottomSheetScrollView(
  { children, onLayout, onScroll, onContentSizeChange, contentContainerStyle, ...props },
  forwardedRef,
) {
  const cover = useContext(SheetFooterContext);
  const { scroll, focus, reveal, trackScroll } = useFocusedFieldReveal<BottomSheetScrollViewMethods>({
    cover,
    keepTopVisible: true,
  });
  const padding = useSafeBottomPadding(contentContainerStyle);
  // iOS keeps Gorhom's interactive positioning; Android reserves keyboard room.
  const keyboardSpace = useAndroidKeyboardSpace();
  return (
    <NativeBottomSheetScrollView
      {...props}
      contentContainerStyle={[contentContainerStyle, padding]}
      ref={(instance) => {
        scroll.current = instance;
        if (typeof forwardedRef === "function") forwardedRef(instance);
        else if (forwardedRef) forwardedRef.current = instance;
      }}
      onScroll={(event) => {
        trackScroll(event);
        if (typeof onScroll === "function") onScroll(event);
      }}
      onLayout={(event) => {
        if (typeof onLayout === "function") onLayout(event);
        reveal();
      }}
      onContentSizeChange={(width, height) => {
        if (typeof onContentSizeChange === "function") onContentSizeChange(width, height);
        reveal();
      }}
    >
      <SheetFieldFocusContext.Provider value={focus}>{children}</SheetFieldFocusContext.Provider>
      {keyboardSpace > 0 && <View testID="sheet-keyboard-space" style={{ height: keyboardSpace }} />}
    </NativeBottomSheetScrollView>
  );
});

/** Platform layout only. Callers retain form state, validation and mutations. */
export const BottomSheetModal = forwardRef<
  NativeBottomSheetModal,
  Omit<ComponentProps<typeof NativeBottomSheetModal>, "children"> & {
    children: ReactNode;
    /** Short prompts that already offer their own dismiss action leave out the back button. */
    showBackButton?: boolean;
  }
>(function BottomSheetModal(
  {
    children,
    onChange,
    onDismiss,
    enablePanDownToClose = true,
    showBackButton = true,
    // Gorhom clips the sheet inside a container shortened by bottomInset, while the
    // backdrop still fills the screen, so any inset leaves a cut edge and a dimmed band.
    bottomInset = 0,
    // Dynamic sizing adds a content-height detent that misplaces modals on iOS
    // (#405); every sheet declares its snap points instead.
    enableDynamicSizing = false,
    footerComponent,
    ...props
  },
  forwardedRef,
) {
  const insets = useSafeAreaInsets();
  // Gorhom renders the footer outside the children, so both get the same slot explicitly.
  const footerSlot = useRef<SheetMeasurable | null>(null);
  const inner = useRef<NativeBottomSheetModal | null>(null);
  const presented = useRef(false);
  const [open, setOpen] = useState(false);
  // Screens dismiss a closed sheet when they mount. Gorhom 5.2.14 treats a dismiss
  // before the first present as an endless close and then ignores present(), so the
  // sheet would never open. Only a presented sheet is dismissed.
  useImperativeHandle(
    forwardedRef,
    () =>
      new Proxy({} as NativeBottomSheetModal, {
        get(_target, key: keyof NativeBottomSheetModal) {
          if (key === "present") {
            return (...args: Parameters<NativeBottomSheetModal["present"]>) => {
              presented.current = true;
              inner.current?.present(...args);
            };
          }
          if (key === "dismiss") {
            return (...args: Parameters<NativeBottomSheetModal["dismiss"]>) => {
              if (presented.current) inner.current?.dismiss(...args);
            };
          }
          const value = inner.current?.[key];
          return typeof value === "function" ? value.bind(inner.current) : value;
        },
      }),
    [],
  );
  const close = useCallback(() => {
    if (enablePanDownToClose) inner.current?.dismiss();
  }, [enablePanDownToClose]);
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [close, open]);
  return (
    <NativeBottomSheetModal
      accessible={false}
      {...props}
      ref={inner}
      onDismiss={() => {
        presented.current = false;
        onDismiss?.();
      }}
      topInset={insets.top + 8}
      bottomInset={bottomInset}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose={enablePanDownToClose}
      // Gorhom skips interactive keyboard positioning on Android + adjustResize.
      // Fill the resized parent so the scroll view can reveal every focused field.
      keyboardBehavior={Platform.OS === "android" ? "fillParent" : "interactive"}
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
      android_keyboardInputMode="adjustResize"
      footerComponent={
        footerComponent &&
        ((footerProps) => {
          const Footer = footerComponent;
          return (
            <SheetFooterContext.Provider value={footerSlot}>
              <Footer {...footerProps} />
            </SheetFooterContext.Provider>
          );
        })
      }
      onChange={(index, ...args) => {
        setOpen(index >= 0);
        onChange?.(index, ...args);
      }}
      handleComponent={(handleProps) => (
        <View style={styles.header}>
          <BottomSheetHandle {...handleProps} indicatorStyle={props.handleIndicatorStyle} />
          {showBackButton && <BackButton onPress={close} disabled={!enablePanDownToClose} style={styles.back} />}
        </View>
      )}
    >
      <SheetInputContext.Provider value>
        <SheetFooterContext.Provider value={footerSlot}>{children}</SheetFooterContext.Provider>
      </SheetInputContext.Provider>
    </NativeBottomSheetModal>
  );
});

const styles = StyleSheet.create({
  header: {
    backgroundColor: lightTokens.surfaceDefault,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  back: { marginLeft: 16, marginBottom: 8 },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: lightTokens.surfaceDefault,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: lightTokens.borderDefault,
  },
});
