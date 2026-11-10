import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { useReauthentication } from "@/presentation/hooks/useReauthentication";
import { Button } from "@/presentation/components/ui/Button";
import { AuthSocialButtons } from "./AuthSocialButtons";
import { vinnotColors as colors, vinnotFonts as fonts } from "@/shared/theme/vinnotTheme";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { fontSizes } from "@/shared/theme/typography";

type Challenge = ReturnType<typeof useReauthentication>;
type Presentation = {
  challenge: Challenge;
  activeHost: string | undefined;
  registerHost: (id: string) => () => void;
};
const PresentationContext = createContext<Presentation | null>(null);

/** One challenge controller, with the top native modal owning its presentation. */
export function ReauthenticationProvider({ children }: { children: ReactNode }) {
  const challenge = useReauthentication();
  const [hosts, setHosts] = useState<string[]>([]);
  const registerHost = useCallback((id: string) => {
    setHosts((current) => [...current.filter((host) => host !== id), id]);
    return () => setHosts((current) => current.filter((host) => host !== id));
  }, []);
  const activeHost = hosts.at(-1);
  return (
    <PresentationContext.Provider value={{ challenge, activeHost, registerHost }}>
      {children}
      {challenge.open && !activeHost && (
        <Modal transparent animationType="fade" visible onRequestClose={challenge.cancel}>
          <ConfirmationForm challenge={challenge} />
        </Modal>
      )}
    </PresentationContext.Provider>
  );
}

/** Embed the challenge in an existing native modal instead of presenting another. */
export function ReauthenticationHost({
  visible,
  onRecovery,
  children,
}: {
  visible: boolean;
  onRecovery: () => void;
  children: (host: {
    confirming: boolean;
    cancelConfirmation: () => void;
    confirmation: ReactNode;
  }) => ReactNode;
}) {
  const presentation = useContext(PresentationContext);
  const id = useId();
  const registerHost = presentation?.registerHost;
  useLayoutEffect(() => (visible ? registerHost?.(id) : undefined), [visible, registerHost, id]);
  const confirming = Boolean(
    visible && presentation?.activeHost === id && presentation.challenge.open,
  );
  return children({
    confirming,
    cancelConfirmation: () => presentation?.challenge.cancel(),
    confirmation:
      confirming && presentation ? (
        <ConfirmationForm challenge={presentation.challenge} onRecovery={onRecovery} />
      ) : null,
  });
}

function ConfirmationForm({
  challenge,
  onRecovery,
}: {
  challenge: Challenge;
  onRecovery?: () => void;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  // Older challenge doubles (and clients) may omit providers: fall back to password-only.
  const { providers } = challenge;
  const withProvider = providers.length > 0;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.overlay}
    >
      <ScrollView
        style={styles.card}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        accessibilityViewIsModal
      >
        <Text accessibilityRole="header" style={styles.title}>
          {t("reauthentication.title")}
        </Text>
        <Text style={styles.description}>
          {t(withProvider ? "reauthentication.descriptionWithProvider" : "reauthentication.description")}
        </Text>
        {withProvider && (
          <>
            <AuthSocialButtons
              placement="inline"
              providers={providers}
              isSubmitting={challenge.busy}
              busyProvider={challenge.busyProvider}
              onSocial={(provider) => {
                if (provider !== "FACEBOOK") void challenge.confirmWithProvider(provider);
              }}
            />
            {challenge.failedProvider && (
              <Text accessibilityRole="alert" style={styles.error}>
                {t("reauthentication.providerFailed", {
                  provider: challenge.failedProvider === "GOOGLE" ? "Google" : "Apple",
                })}
              </Text>
            )}
            <Text style={styles.separator}>{t("reauthentication.orPassword")}</Text>
          </>
        )}
        <TextInput
          style={styles.input}
          secureTextEntry
          autoFocus={!withProvider}
          autoCapitalize="none"
          textContentType="password"
          autoComplete="current-password"
          maxLength={128}
          value={password}
          onChangeText={setPassword}
          editable={!challenge.busy}
          accessibilityLabel={t("reauthentication.password")}
          placeholder={t("reauthentication.password")}
        />
        {challenge.failed && (
          <Text accessibilityRole="alert" style={styles.error}>
            {t("reauthentication.failed")}
          </Text>
        )}
        <Button
          fullWidth
          loading={challenge.busy && !challenge.busyProvider}
          disabled={!password || challenge.busy}
          onPress={() => void challenge.confirm(password)}
        >
          {t("reauthentication.confirm")}
        </Button>
        <Button fullWidth variant="ghost" onPress={challenge.cancel}>
          {t("reauthentication.cancel")}
        </Button>
        <Button
          fullWidth
          variant="ghost"
          onPress={() => {
            challenge.cancel();
            onRecovery?.();
            router.push("/(auth)/forgot-password");
          }}
        >
          {t("reauthentication.recovery")}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: lightTokens.surfaceOverlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii["3xl"],
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    flexGrow: 0,
  },
  content: { padding: 24, gap: 14 },
  title: { color: colors.ink, fontFamily: fonts.semibold, fontSize: fontSizes.xl },
  description: {
    color: colors.muted,
    fontFamily: fonts.regular,
    lineHeight: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 18,
  },
  input: {
    fontFamily: fonts.regular,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
  },
  error: { fontFamily: fonts.regular, color: colors.danger, fontSize: fontSizes.sm },
  separator: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: fontSizes.xs,
    textAlign: "center",
    textTransform: "uppercase",
  },
});
