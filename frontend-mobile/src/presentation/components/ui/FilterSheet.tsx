import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  type ScrollViewInstance,
  Text,
  View,
} from "react-native";
import { SlidersHorizontal, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { lightTokens, radii, shadowColors } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";
import { SheetFieldFocusContext } from "./SheetInputContext";
import { useFocusedFieldReveal } from "./useFocusedFieldReveal";
import { useModalAnimation } from "./motion/reducedMotion";

type FilterSheetProps = {
  visible: boolean;
  title: string;
  activeCount?: number;
  clearLabel?: string;
  closeAccessibilityLabel?: string;
  onClear?: () => void;
  onClose: () => void;
  children: ReactNode;
};

export function FilterSheet({
  visible,
  title,
  activeCount = 0,
  clearLabel,
  closeAccessibilityLabel,
  onClear,
  onClose,
  children,
}: FilterSheetProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const closeLabel = closeAccessibilityLabel ?? t("common.closeFilters");
  // A focused search reveals its whole option panel above the keyboard, keeping the panel top visible.
  const { scroll, focus, reveal, trackScroll } = useFocusedFieldReveal<ScrollViewInstance>({ keepTopVisible: true });
  const animationType = useModalAnimation("slide");

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* The whole sheet rises above the keyboard, so an open option list stays visible and tappable. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.root, { paddingTop: insets.top + 12 }]}
      >
        <Pressable style={styles.backdrop} onPress={onClose} accessible={false} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.icon}>
                <SlidersHorizontal size={18} color={vinnotColors.brand} />
              </View>
              <Text style={styles.title}>{title}</Text>
              {activeCount > 0 ? (
                <View style={styles.count}>
                  <Text style={styles.countText}>{activeCount}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.headerActions}>
              {activeCount > 0 && onClear && clearLabel ? (
                <MotionPressable
                  onPress={onClear}
                  style={styles.clear}
                  accessibilityRole="button"
                  accessibilityLabel={clearLabel}
                >
                  <Text style={styles.clearText}>{clearLabel}</Text>
                </MotionPressable>
              ) : null}
              <MotionPressable
                onPress={onClose}
                style={styles.close}
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
              >
                <X size={19} color={vinnotColors.ink} />
              </MotionPressable>
            </View>
          </View>
          <ScrollView
            ref={scroll}
            onScroll={trackScroll}
            scrollEventThrottle={16}
            onLayout={reveal}
            onContentSizeChange={reveal}
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <SheetFieldFocusContext.Provider value={focus}>{children}</SheetFieldFocusContext.Provider>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: lightTokens.surfaceOverlay,
  },
  sheet: {
    maxHeight: "86%",
    flexShrink: 1,
    borderTopLeftRadius: radii["3xl"],
    borderTopRightRadius: radii["3xl"],
    backgroundColor: vinnotColors.surface,
    shadowColor: shadowColors.brand,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 20,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: radii.full,
    marginTop: 10,
    marginBottom: 5,
    backgroundColor: lightTokens.borderStrong,
  },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: vinnotColors.border,
    paddingHorizontal: 20,
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: vinnotColors.brandSoft,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
  },
  title: {
    flexShrink: 1,
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.lg,
    lineHeight: 25,
    color: vinnotColors.ink,
  },
  count: {
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    backgroundColor: vinnotColors.brand,
    paddingHorizontal: 6,
  },
  countText: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.meta,
    color: vinnotColors.white,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clear: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  clearText: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.sm,
    color: vinnotColors.brand,
  },
  close: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: vinnotColors.brandSoft,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  content: {
    gap: 14,
    padding: 20,
  },
});
