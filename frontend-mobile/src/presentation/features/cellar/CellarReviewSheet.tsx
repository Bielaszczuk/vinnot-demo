import { useCallback, useEffect, useRef } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInputInstance,
  type ScrollViewInstance,
} from "react-native";
import { MessageSquare, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { CellarEntry } from "@/domain/cellar/cellar.types";
import { toWineType } from "@/domain/wine/wine.types";
import { useCellarReviewPublication } from "@/presentation/hooks/useCellarReviewPublication";
import { Button } from "@/presentation/components/ui/Button";
import { Skeleton } from "@/presentation/components/ui/Feedback";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { useModalAnimation } from "@/presentation/components/ui/motion/reducedMotion";
import { ReviewFormFields } from "../wine/ReviewFormFields";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";
import { radii, lightTokens } from "@/shared/theme/tokens";

export function CellarReviewSheet({ entry, onClose, onOpenWine }: {
  entry: CellarEntry; onClose: () => void; onOpenWine: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const animationType = useModalAnimation("slide");
  const { status, canPublish, busy, close, submit } = useCellarReviewPublication(entry, onClose);
  const scroll = useRef<ScrollViewInstance>(null);
  const focusedInput = useRef<TextInputInstance | null>(null);
  const scrollOffset = useRef(0);
  const revealInput = useCallback(() => {
    focusedInput.current?.measureInWindow((_x, y, _width, height) => {
      scroll.current?.getNativeScrollRef()?.measureInWindow((_scrollX, scrollY, _scrollWidth, scrollHeight) => {
        const overflow = y + height + 16 - (scrollY + scrollHeight);
        if (overflow > 0) scroll.current?.scrollTo({ y: scrollOffset.current + overflow, animated: true });
      });
    });
  }, []);
  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", revealInput);
    return () => subscription.remove();
  }, [revealInput]);
  const focusInput = (input: TextInputInstance | null) => {
    focusedInput.current = input;
    if (Keyboard.isVisible()) revealInput();
  };
  return (
    <Modal transparent animationType={animationType} visible onRequestClose={close}>
      {/* A native modal is outside the app's gesture root on Android: the pour control needs its own. */}
      <GestureHandlerRootView style={styles.root}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} disabled={busy}
          accessibilityRole="button" accessibilityLabel={t("common.close")} />
        <View style={[styles.sheet, { marginTop: insets.top + 24, paddingBottom: Math.max(16, insets.bottom) }]}
          accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text style={styles.title}>{t("cellar.publishReview")}</Text>
              <Text style={styles.subtitle}>{entry.wine.name}</Text>
            </View>
            <Pressable onPress={close} disabled={busy} style={styles.close}
              accessibilityRole="button" accessibilityLabel={t("common.close")}>
              <X size={20} color={vinnotColors.brand} />
            </Pressable>
          </View>
          <ScrollView ref={scroll} style={styles.scroll}
            onLayout={() => { if (Keyboard.isVisible()) revealInput(); }}
            onScroll={event => { scrollOffset.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
            {(status.isFetching || status.isLoading) && !busy ? (
              <View style={styles.content}><Skeleton height={80} radius={16} /><Skeleton height={160} radius={16} /></View>
            ) : status.isError ? (
              <QueryErrorState error={status.error} onRetry={() => void status.refetch()} />
            ) : status.data?.hasReview ? (
              <View style={styles.notice}>
                <Text style={styles.title}>{t("cellar.reviewExistsTitle")}</Text>
                <Text style={styles.subtitle}>{t("cellar.reviewExistsDescription")}</Text>
                <Button onPress={onOpenWine}>{t("cellar.openWine")}</Button>
              </View>
            ) : canPublish || busy ? (
              <>
                <View style={styles.notice}>
                  <MessageSquare size={22} color={vinnotColors.brand} />
                  <Text style={styles.noticeText}>{t("cellar.publishReviewDescription")}</Text>
                </View>
                <ReviewFormFields initialRating={entry.rating ?? 0} initialComment={entry.notes ?? ""}
                  initialVintage={entry.vintage ?? null} suggestedVintage={entry.wine.vintage}
                  wineType={toWineType(entry.wine.type)}
                  onSubmit={submit} onCancel={close} onFieldFocus={focusInput} />
              </>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: lightTokens.surfaceOverlay },
  sheet: { height: "90%", backgroundColor: vinnotColors.canvas, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { alignSelf: "center", width: 36, height: 4, borderRadius: radii.sm, backgroundColor: vinnotColors.borderStrong, marginTop: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: vinnotColors.border },
  heading: { flex: 1, gap: 4 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.full, backgroundColor: vinnotColors.brandSoft },
  scroll: { flex: 1 },
  title: { fontFamily: vinnotFonts.semibold, fontSize: fontSizes.xl, lineHeight: 28, color: vinnotColors.ink },
  subtitle: { fontFamily: vinnotFonts.regular, fontSize: fontSizes.ui, lineHeight: 22, color: vinnotColors.muted },
  content: { padding: 20, gap: 16 },
  notice: { gap: 12, padding: 16, borderRadius: radii["2xl"], borderWidth: 1, borderColor: vinnotColors.brandTint, backgroundColor: vinnotColors.brandSoft },
  noticeText: { fontFamily: vinnotFonts.regular, fontSize: fontSizes.ui, lineHeight: 22, color: vinnotColors.brandDeep },
});
