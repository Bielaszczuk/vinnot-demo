/**
 * EntityFormSheet — the shared shell of every catalog form sheet: a title, an optional
 * error summary, a keyboard-aware scroll body and actions pinned to the bottom.
 * It cannot be dismissed while saving, and with unsaved changes every way out (swipe,
 * backdrop, Android back, Cancel) asks before discarding. Form state stays in the caller.
 */
import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { BottomSheetScrollViewMethods } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetStickyFooter,
} from "@/presentation/components/ui/BottomSheet";
import { Button } from "@/presentation/components/ui/Button";
import { useSheetDismissGuard } from "@/presentation/components/ui/useSheetDismissGuard";
import { lightTokens, spacing } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { FormErrorSummary } from "./FormErrorSummary";

export interface EntityFormSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Unsaved changes: closing asks first. */
  dirty: boolean;
  /** Saving or uploading: the sheet stays open and the actions are disabled. */
  busy: boolean;
  /** The save itself is running: the primary action shows its spinner. */
  saving: boolean;
  submitLabel: string;
  onSubmit: () => void;
  /** Shown above the sections after a failed validation. */
  errorSummary?: string | null;
  scrollRef?: RefObject<BottomSheetScrollViewMethods | null>;
  children: ReactNode;
}

export function EntityFormSheet({
  visible,
  onClose,
  title,
  subtitle,
  dirty,
  busy,
  saving,
  submitLabel,
  onSubmit,
  errorSummary,
  scrollRef,
  children,
}: EntityFormSheetProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["94%"], []);
  const guard = useSheetDismissGuard({ sheetRef, visible, dirty, busy, onClose });

  useEffect(() => {
    if (visible) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [visible]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose={guard.enablePanDownToClose}
      enableContentPanningGesture={false}
      onDismiss={guard.handleDismiss}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior={guard.backdropPressBehavior}
        />
      )}
      footerComponent={(props) => (
        <BottomSheetStickyFooter {...props}>
          <Button variant="ghost" disabled={busy} onPress={guard.requestClose} style={styles.action}>
            {t("common.cancel")}
          </Button>
          <Button onPress={onSubmit} disabled={busy && !saving} loading={saving} style={styles.action}>
            {submitLabel}
          </Button>
        </BottomSheetStickyFooter>
      )}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          )}
        </View>
        {!!errorSummary && <FormErrorSummary message={errorSummary} />}
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

/** Room under the last section so the pinned actions never cover it. */
const FOOTER_CLEARANCE = 96;

const styles = StyleSheet.create({
  background: { backgroundColor: lightTokens.surfaceDefault },
  handle: { backgroundColor: lightTokens.borderStrong },
  content: { gap: spacing[4], paddingHorizontal: spacing[5], paddingBottom: FOOTER_CLEARANCE },
  header: { gap: spacing[1] },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  subtitle: { ...textStyles.bodySmall, color: lightTokens.textTertiary },
  action: { flex: 1 },
});
