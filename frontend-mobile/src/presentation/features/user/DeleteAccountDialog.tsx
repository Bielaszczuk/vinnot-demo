import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import { TextField } from "@/presentation/components/ui/TextField";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { ReauthenticationHost } from "../auth/ReauthenticationDialog";
import type { usePermanentAccountDeletion } from "./usePermanentAccountDeletion";

export function DeleteAccountDialog({
  confirmation,
}: {
  confirmation: ReturnType<typeof usePermanentAccountDeletion>;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    // The proof prompt renders inside this Modal: iOS may hide a second native modal opened over it.
    <ReauthenticationHost visible={confirmation.visible} onRecovery={confirmation.close}>
      {({ confirming, cancelConfirmation, confirmation: proofPrompt }) => (
        <Modal
          visible={confirmation.visible}
          transparent
          animationType="fade"
          onRequestClose={() => (confirming ? cancelConfirmation() : confirmation.close())}
        >
          <KeyboardAvoidingView
            style={[
              styles.overlay,
              { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
            ]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            enabled={!confirming}
          >
            <View
              style={styles.dialog}
              accessibilityViewIsModal={!confirming}
              accessibilityElementsHidden={confirming}
              importantForAccessibility={confirming ? "no-hide-descendants" : "auto"}
              pointerEvents={confirming ? "none" : "auto"}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.content}
              >
                <Text accessibilityRole="header" style={styles.title}>
                  {t("profile.deleteAccountConfirmTitle")}
                </Text>
                <Text style={styles.message}>{t("profile.deleteAccountConfirmMessage")}</Text>
                <TextField
                  label={t("profile.deleteAccountTypePhrase", { phrase: confirmation.phrase })}
                  placeholder={confirmation.phrase}
                  value={confirmation.text}
                  onChangeText={confirmation.setText}
                  editable={!confirmation.busy}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  returnKeyType="done"
                />
                <Button
                  variant="danger"
                  disabled={!confirmation.matches}
                  loading={confirmation.busy}
                  onPress={() => void confirmation.submit()}
                >
                  {t("profile.deleteAccount")}
                </Button>
                <Button variant="outline" disabled={confirmation.busy} onPress={confirmation.close}>
                  {t("common.cancel")}
                </Button>
              </ScrollView>
            </View>
            {proofPrompt}
          </KeyboardAvoidingView>
        </Modal>
      )}
    </ReauthenticationHost>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: lightTokens.surfaceOverlay,
  },
  dialog: {
    maxHeight: "100%",
    flexShrink: 1,
    borderRadius: radii.lg,
    backgroundColor: lightTokens.surfaceDefault,
    overflow: "hidden",
  },
  content: { padding: 24, gap: 20 },
  title: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  message: { ...textStyles.bodySmall, color: lightTokens.textSecondary },
});
