/**
 * PushPermissionSheet — a short ask to turn notifications on: a title, one line and two buttons. It appears before
 * the system prompt, and reminds a member whose notifications are off (with the way to turn them back on).
 */
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BellOff, BellRing } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import { Button } from "@/presentation/components/ui/Button";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

/**
 * `event`: after a confirmed ticket; `intro`: the first launch; `enable` and `settings`: the cold-start reminder
 * while notifications are off (the system can still ask, or only the system settings can turn them on).
 */
export type PushPermissionSheetVariant = "event" | "intro" | "enable" | "settings";

export interface PushPermissionSheetProps {
  visible: boolean;
  variant?: PushPermissionSheetVariant;
  busy?: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}

interface SheetCopy {
  title: string;
  body: string;
  allow: string;
  later: string;
}

const LAUNCH: SheetCopy = {
  title: "pushNotifications.launch.title",
  body: "pushNotifications.launch.body",
  allow: "pushNotifications.launch.allow",
  later: "pushNotifications.launch.later",
};

const COPY: Record<PushPermissionSheetVariant, SheetCopy> = {
  event: {
    title: "pushNotifications.prompt.title",
    body: "pushNotifications.prompt.body",
    allow: "pushNotifications.prompt.allow",
    later: "pushNotifications.prompt.later",
  },
  intro: LAUNCH,
  enable: LAUNCH,
  settings: {
    ...LAUNCH,
    body: "pushNotifications.reminder.settingsBody",
    allow: "pushNotifications.reminder.openSettings",
  },
};

export function PushPermissionSheet({
  visible,
  variant = "event",
  busy = false,
  onAllow,
  onDismiss,
}: PushPermissionSheetProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);
  const copy = COPY[variant];
  // Fixed height: the content is short. The shared sheet reaches the bottom edge and pads above the home indicator.
  const snapPoints = useMemo(() => ["50%"], []);

  useEffect(() => {
    if (visible) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [visible]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      showBackButton={false}
      enablePanDownToClose={!busy}
      onDismiss={onDismiss}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.icon}>
          {variant === "settings" ? (
            <BellOff size={26} color={lightTokens.brandPrimary} />
          ) : (
            <BellRing size={26} color={lightTokens.brandPrimary} />
          )}
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} accessibilityRole="header">
            {t(copy.title)}
          </Text>
          <Text style={styles.body}>{t(copy.body)}</Text>
        </View>
        <View style={styles.actions}>
          <Button fullWidth loading={busy} onPress={onAllow} accessibilityLabel={t(copy.allow)}>
            {t(copy.allow)}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            disabled={busy}
            onPress={onDismiss}
            accessibilityLabel={t(copy.later)}
          >
            {t(copy.later)}
          </Button>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: { backgroundColor: lightTokens.surfaceDefault },
  handle: { backgroundColor: lightTokens.borderStrong },
  content: { gap: 20, paddingHorizontal: 20, paddingTop: 12 },
  icon: {
    width: 56,
    height: 56,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    backgroundColor: lightTokens.brandSecondary,
  },
  copy: { gap: 8, alignItems: "center" },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary, textAlign: "center" },
  body: { ...textStyles.bodyMedium, color: lightTokens.textTertiary, textAlign: "center" },
  actions: { gap: 10, marginTop: 4 },
});
