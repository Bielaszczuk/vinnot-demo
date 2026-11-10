import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppleIcon, FacebookIcon, GoogleIcon } from "@/presentation/components/icons/SocialIcons";
import type { SocialProvider } from "@/domain/user/social-provider";
import { authColors, authFonts } from "./authTheme";
import { env } from "@/shared/config/env";
import { fontSizes } from "@/shared/theme/typography";
import { radii } from "@/shared/theme/tokens";

type AuthSocialButtonsProps = {
  isSubmitting: boolean;
  /** "inline" renders only the buttons, e.g. inside the identity confirmation. */
  placement?: "after-form" | "before-form" | "inline";
  busyProvider?: SocialProvider | null;
  onSocial: (provider: SocialProvider) => void;
  /** Restricts the offer, e.g. to the identities linked to the signed-in account. */
  providers?: readonly SocialProvider[];
};

type SocialButtonProps = {
  provider: SocialProvider;
  busyProvider: SocialProvider | null;
  disabled: boolean;
  onPress: (provider: SocialProvider) => void;
};

function SocialButton({ provider, busyProvider, disabled, onPress }: SocialButtonProps) {
  const [pressed, setPressed] = useState(false);
  const busy = busyProvider === provider;
  const providerName =
    provider === "GOOGLE" ? "Google" : provider === "FACEBOOK" ? "Facebook" : "Apple";

  return (
    <Pressable
      onPress={() => onPress(provider)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={providerName}
      accessibilityState={{ disabled, busy }}
      style={[
        styles.socialButton,
        pressed && !disabled && styles.socialButtonPressed,
        disabled && styles.socialButtonDisabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={authColors.brand} />
      ) : provider === "GOOGLE" ? (
        <GoogleIcon size={23} />
      ) : provider === "FACEBOOK" ? (
        <FacebookIcon size={22} color="#1877F2" />
      ) : (
        <AppleIcon size={24} color={authColors.ink} />
      )}
    </Pressable>
  );
}

export function AuthSocialButtons({
  isSubmitting,
  placement = "after-form",
  busyProvider = null,
  onSocial,
  providers,
}: AuthSocialButtonsProps) {
  const { t } = useTranslation();
  const isBusy = isSubmitting || busyProvider !== null;
  const offers = (provider: SocialProvider) => !providers || providers.includes(provider);

  return (
    <View
      style={[
        styles.block,
        placement === "before-form" && styles.beforeForm,
        placement === "inline" && styles.inline,
      ]}
    >
      {placement === "after-form" && (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t("auth.orContinueWith")}</Text>
          <View style={styles.dividerLine} />
        </View>
      )}

      <View style={styles.socialRow}>
        {offers("GOOGLE") && (
          <SocialButton
            provider="GOOGLE"
            busyProvider={busyProvider}
            disabled={isBusy}
            onPress={onSocial}
          />
        )}
        {env.facebookLoginEnabled && offers("FACEBOOK") && (
          <SocialButton
            provider="FACEBOOK"
            busyProvider={busyProvider}
            disabled={isBusy}
            onPress={onSocial}
          />
        )}
        {Platform.OS === "ios" && offers("APPLE") ? (
          <SocialButton
            provider="APPLE"
            busyProvider={busyProvider}
            disabled={isBusy}
            onPress={onSocial}
          />
        ) : null}
      </View>
      {placement === "before-form" && (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t("auth.orRegisterWithEmail")}</Text>
          <View style={styles.dividerLine} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    width: "100%",
    marginTop: 28,
  },
  beforeForm: { marginTop: 0, marginBottom: 20, gap: 22 },
  inline: { marginTop: 0 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: authColors.border,
  },
  dividerText: {
    color: authColors.muted,
    fontFamily: authFonts.medium,
    fontSize: fontSizes["2xs"],
    lineHeight: 16,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    marginTop: 20,
  },
  socialButton: {
    width: 58,
    height: 58,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: radii.md,
    backgroundColor: authColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  socialButtonPressed: {
    borderColor: authColors.brand,
    backgroundColor: authColors.brandSoft,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
});
