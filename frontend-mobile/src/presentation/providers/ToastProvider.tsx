/** Imperative feedback API; presentation owns appearance and lifecycle only. */
import { createContext, useCallback, useContext, useRef, useState, useEffect, ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedbackNotice, type FeedbackVariant } from "@/presentation/components/ui/FeedbackNotice";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { radii } from "@/shared/theme/tokens";

interface Toast { id: string; message: string; variant: FeedbackVariant }
interface ToastContextValue {
  showToast: (message: string, variant?: FeedbackVariant) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}
const ToastContext = createContext<ToastContextValue>({
  showToast: () => {}, showSuccess: () => {}, showError: () => {}, showInfo: () => {},
});

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [screenReader, setScreenReader] = useState<boolean | null>(null);
  const [leaving, setLeaving] = useState(false);
  const dismiss = useCallback(() => setLeaving(true), []);
  useEffect(() => {
    let active = true;
    // OS event subscriptions are external state, not values derived from render.
    // eslint-disable-next-line no-restricted-syntax
    const motion = (value: boolean) => { if (active) setReduceMotion(value); };
    // eslint-disable-next-line no-restricted-syntax
    const reader = (value: boolean) => { if (active) setScreenReader(value); };
    void AccessibilityInfo.isReduceMotionEnabled().then(motion).catch(() => motion(true));
    void AccessibilityInfo.isScreenReaderEnabled().then(reader).catch(() => reader(true));
    const motionSubscription = AccessibilityInfo.addEventListener("reduceMotionChanged", motion);
    const readerSubscription = AccessibilityInfo.addEventListener("screenReaderChanged", reader);
    return () => { active = false; motionSubscription.remove(); readerSubscription.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      if (leaving) onRemove(toast.id);
      return;
    }
    if (!leaving) translateY.setValue(-8);
    const animation = Animated.parallel([
      Animated.timing(opacity, { toValue: leaving ? 0 : 1, duration: leaving ? 180 : 240, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: leaving ? -4 : 0, duration: leaving ? 180 : 240,
        easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => { if (finished && leaving) onRemove(toast.id); });
    return () => animation.stop();
  }, [leaving, reduceMotion, opacity, translateY, onRemove, toast.id]);
  useEffect(() => {
    if (screenReader !== false || leaving) return;
    const timer = setTimeout(dismiss, toast.variant === "error" ? 6000 : 4000);
    return () => clearTimeout(timer);
  }, [dismiss, leaving, screenReader, toast.variant]);
  useEffect(() => {
    if (screenReader && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(toast.message);
  }, [screenReader, toast.message]);
  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
      <FeedbackNotice variant={toast.variant} message={toast.message} onDismiss={dismiss} />
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const insets = useSafeAreaInsets();
  const nextId = useRef(0);
  const showToast = useCallback((message: string, variant: FeedbackVariant = "info") => {
    const id = String(++nextId.current);
    setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
  }, []);
  const showSuccess = useCallback((m: string) => showToast(m, "success"), [showToast]);
  const showError = useCallback((m: string) => showToast(m, "error"), [showToast]);
  const showInfo = useCallback((m: string) => showToast(m, "info"), [showToast]);
  const removeToast = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo }}>
      {children}
      <View style={[styles.container, { top: insets.top + 12 }]} pointerEvents="box-none">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />)}
      </View>
    </ToastContext.Provider>
  );
}
export function useToast(): ToastContextValue { return useContext(ToastContext); }

/**
 * A native modal (the label scanner and the wines opened from it) covers the root toast
 * host, so screens inside it get a host of their own and `useToast` renders on top.
 */
export function ModalScreenToastHost({ inModal, children }: { inModal: boolean; children: ReactNode }) {
  return inModal ? <ToastProvider>{children}</ToastProvider> : <>{children}</>;
}
const styles = StyleSheet.create({
  container: { position: "absolute", left: 16, right: 16, zIndex: 9999, gap: 10,
    maxWidth: 480, width: "auto", alignSelf: "center" },
  toast: { shadowColor: vinnotColors.brandDeep, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 8, borderRadius: radii["2xl"] },
});
