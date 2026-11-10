import { Pressable, StyleSheet, Text, View } from "react-native";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { localizeMessage } from "@/shared/i18n/localizeMessage";
import { FeedbackNotice } from "@/presentation/components/ui/FeedbackNotice";
import type { LoginUserInput } from "@/domain/user/user.validators";
import type { SocialProvider } from "@/domain/user/social-provider";
import { AuthButton } from "./AuthButton";
import { AuthLayout } from "./AuthLayout";
import { AuthSocialButtons } from "./AuthSocialButtons";
import { AuthTextField } from "./AuthTextField";
import { authColors, authFonts } from "./authTheme";
import { fontSizes } from "@/shared/theme/typography";

type Props = {
  control: Control<LoginUserInput>;
  errors: FieldErrors<LoginUserInput>;
  isSubmitting: boolean;
  busyProvider: SocialProvider | null;
  serverError: string | null;
  onSubmit: () => void;
  onSocial: (provider: SocialProvider) => void;
  onForgotPassword: () => void;
};

export function LoginScreenView({
  control,
  errors,
  isSubmitting,
  busyProvider,
  serverError,
  onSubmit,
  onSocial,
  onForgotPassword,
}: Props) {
  const { t } = useTranslation();

  return (
    <AuthLayout heroTitle={t("auth.welcomeBack")} heroSubtitle={t("auth.signInToContinue")}>
      <View style={styles.fields}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthTextField
              label={t("auth.email")}
              icon="mail"
              placeholder={t("auth.emailPlaceholderExample")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              error={localizeMessage(t, errors.email?.message)}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthTextField
              label={t("auth.password")}
              icon="lock"
              placeholder="••••••••"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              error={localizeMessage(t, errors.password?.message)}
            />
          )}
        />

        <Pressable
          onPress={onForgotPassword}
          hitSlop={8}
          style={styles.forgotRow}
          accessibilityRole="button"
        >
          <Text style={styles.forgotText}>{t("auth.forgotPassword")}</Text>
        </Pressable>

        {serverError ? <FeedbackNotice variant="error" message={localizeMessage(t, serverError) ?? ""} /> : null}

        <AuthButton
          onPress={onSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || busyProvider !== null}
        >
          {t("auth.signIn")}
        </AuthButton>
      </View>

      <AuthSocialButtons
        isSubmitting={isSubmitting}
        busyProvider={busyProvider}
        onSocial={onSocial}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t("auth.noAccount")} </Text>
        <Link href="/(auth)/register" replace>
          <Text style={styles.footerLink}>{t("auth.signUpFree")}</Text>
        </Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 17,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: -7,
  },
  forgotText: {
    color: authColors.ink,
    fontFamily: authFonts.medium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    textDecorationLine: "underline",
    letterSpacing: 0,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 28,
  },
  footerText: {
    color: authColors.muted,
    fontFamily: authFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 19,
    letterSpacing: 0,
  },
  footerLink: {
    color: authColors.brand,
    fontFamily: authFonts.semibold,
    fontSize: fontSizes.xs,
    lineHeight: 19,
    letterSpacing: 0,
  },
});
