import { Modal, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import { ReauthenticationHost } from "@/presentation/features/auth/ReauthenticationDialog";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

/**
 * Asks before an action that cannot be undone. The identity confirmation the backend may require opens inside this
 * modal, so it never competes with it for the screen.
 */
export function NotificationConfirmDialog({
  visible,
  title,
  message,
  details = [],
  help,
  confirmLabel,
  busy,
  disabled = false,
  danger = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  /** Short lines under the message, such as how the send splits between email and push. */
  details?: string[];
  help?: string;
  confirmLabel: string;
  busy: boolean;
  disabled?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ReauthenticationHost visible={visible} onRecovery={onCancel}>
      {({ confirming, cancelConfirmation, confirmation }) => (
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (confirming) cancelConfirmation();
            else if (!busy) onCancel();
          }}
        >
          <View style={styles.overlay}>
            {!confirming && (
              <View accessibilityViewIsModal style={styles.card}>
                <Text accessibilityRole="header" style={styles.title}>
                  {title}
                </Text>
                <Text style={styles.message}>{message}</Text>
                {details.map((detail) => (
                  <Text key={detail} style={styles.detail}>
                    {detail}
                  </Text>
                ))}
                {!!help && <Text style={styles.help}>{help}</Text>}
                <View style={styles.actions}>
                  <Button variant="outline" disabled={busy} onPress={onCancel} style={styles.action}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant={danger ? "danger" : "primary"}
                    loading={busy}
                    disabled={disabled || busy}
                    onPress={onConfirm}
                    style={styles.action}
                  >
                    {confirmLabel}
                  </Button>
                </View>
              </View>
            )}
          </View>
          {confirmation}
        </Modal>
      )}
    </ReauthenticationHost>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: lightTokens.surfaceOverlay,
  },
  card: {
    backgroundColor: lightTokens.surfaceDefault,
    borderRadius: radii.xl,
    padding: 20,
    gap: 12,
  },
  title: { ...textStyles.titleLarge, color: lightTokens.textPrimary, textAlign: "center" },
  message: { ...textStyles.bodyMedium, color: lightTokens.textSecondary, textAlign: "center" },
  detail: { ...textStyles.labelMedium, color: lightTokens.textPrimary, textAlign: "center" },
  help: { ...textStyles.caption, color: lightTokens.textTertiary, textAlign: "center" },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  action: { flex: 1 },
});
