import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lightTokens, radii, wine } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { useModalAnimation } from "@/presentation/components/ui/motion/reducedMotion";
import { ReauthenticationHost } from "../auth/ReauthenticationDialog";

/** Shared presentation shell; callers own the selected item and decision workflow. */
export function AdminDetailSheet({
  visible,
  title,
  subtitle,
  busy = false,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const animationType = useModalAnimation("slide");
  return (
    <ReauthenticationHost visible={visible} onRecovery={onClose}>
      {({ confirming, cancelConfirmation, confirmation }) => (
        <Modal
          visible={visible}
          transparent
          animationType={animationType}
          onRequestClose={() => {
            if (confirming) cancelConfirmation();
            else if (!busy) onClose();
          }}
        >
          <KeyboardAvoidingView
            style={styles.overlay}
            enabled={Platform.OS === "android" && !confirming}
            behavior="height"
          >
            <Pressable
              accessibilityLabel={t("common.close")}
              accessibilityRole="button"
              disabled={busy || confirming}
              onPress={onClose}
              style={StyleSheet.absoluteFill}
            />
            <View
              accessibilityViewIsModal={!confirming}
              accessibilityElementsHidden={confirming}
              importantForAccessibility={confirming ? "no-hide-descendants" : "auto"}
              pointerEvents={confirming ? "none" : "auto"}
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, 16), marginTop: insets.top + 24 },
              ]}
            >
              <View style={styles.handle} />
              <View style={styles.header}>
                <View style={styles.heading}>
                  <Text style={styles.title}>{title}</Text>
                  {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("common.close")}
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={onClose}
                  style={styles.close}
                >
                  <X size={20} color={wine[700]} />
                </Pressable>
              </View>
              <ScrollView
                style={styles.scroll}
                automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.content}
              >
                {children}
              </ScrollView>
            </View>
            {confirmation}
          </KeyboardAvoidingView>
        </Modal>
      )}
    </ReauthenticationHost>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(30,15,22,0.45)" },
  sheet: {
    height: "90%",
    backgroundColor: lightTokens.surfaceDefault,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 4,
    backgroundColor: lightTokens.borderStrong,
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: lightTokens.borderDefault,
  },
  heading: { flex: 1, gap: 4 },
  title: { ...textStyles.titleLarge, color: lightTokens.textPrimary },
  subtitle: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
  close: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: radii.full,
    backgroundColor: wine[50],
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
});
