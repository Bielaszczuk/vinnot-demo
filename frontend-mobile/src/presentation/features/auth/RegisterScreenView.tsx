import { StyleSheet, Text, View } from "react-native";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { localizeMessage } from "@/shared/i18n/localizeMessage";
import { FeedbackNotice } from "@/presentation/components/ui/FeedbackNotice";
import type { RegisterUserInput } from "@/domain/user/user.validators";
import type { SocialProvider } from "@/domain/user/social-provider";
import { AuthButton } from "./AuthButton";
import { AuthLayout } from "./AuthLayout";
import { AuthSocialButtons } from "./AuthSocialButtons";
import { AuthTextField } from "./AuthTextField";
import { PasswordStrengthBar } from "./PasswordStrengthBar";
import { authColors, authFonts } from "./authTheme";
import { fontSizes } from "@/shared/theme/typography";

type Props = {
  terms: import("react").ReactNode;
  termsReady: boolean;
  control: Control<RegisterUserInput>;
  errors: FieldErrors<RegisterUserInput>;
  isSubmitting: boolean;
  busyProvider: SocialProvider | null;
  serverError: string | null;
  passwordValue: string;
  onSubmit: () => void;
  onSocial: (provider: SocialProvider) => void;
};

export function RegisterScreenView({
  terms,
  termsReady,
  control,
  errors,
  isSubmitting,
  busyProvider,
  serverError,
  passwordValue,
  onSubmit,
  onSocial,
}: Props) {
  const { t } = useTranslation();

  return (
    <AuthLayout heroTitle={t("auth.createAccount")} heroSubtitle={t("auth.joinCommunity")}>
      <AuthSocialButtons
        placement="before-form"
        isSubmitting={isSubmitting}
        busyProvider={busyProvider}
        onSocial={onSocial}
      />
      <View style={styles.fields}>
        {serverError ? <FeedbackNotice variant="error" message={localizeMessage(t, serverError) ?? ""} /> : null}

        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthTextField
              label={t("auth.username")}
              icon="user"
              placeholder={t("auth.usernamePlaceholder")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              returnKeyType="next"
              error={localizeMessage(t, errors.username?.message)}
            />
          )}
        />

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
          name="firstName"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthTextField
              label={t("auth.firstName")}
              icon="user"
              placeholder={t("auth.firstNamePlaceholder")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              textContentType="givenName"
              returnKeyType="next"
              error={localizeMessage(t, errors.firstName?.message)}
            />
          )}
        />

        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthTextField
              label={t("auth.lastName")}
              icon="user"
              placeholder={t("auth.lastNamePlaceholder")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              textContentType="familyName"
              returnKeyType="next"
              error={localizeMessage(t, errors.lastName?.message)}
            />
          )}
        />

        <View>
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
                textContentType="newPassword"
                returnKeyType="next"
                error={localizeMessage(t, errors.password?.message)}
                hint={!errors.password?.message ? t("auth.passwordHint") : undefined}
              />
            )}
          />
          {!errors.password?.message ? <PasswordStrengthBar value={passwordValue} /> : null}
        </View>

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthTextField
              label={t("auth.confirmPassword")}
              icon="lock"
              placeholder="••••••••"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              error={localizeMessage(t, errors.confirmPassword?.message)}
            />
          )}
        />

        {terms}

        <AuthButton
          onPress={onSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || busyProvider !== null || !termsReady}
        >
          {t("auth.createAccountButton")}
        </AuthButton>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t("auth.hasAccount")} </Text>
        <Link href="/(auth)/login" replace>
          <Text style={styles.footerLink}>{t("auth.signIn")}</Text>
        </Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 17,
  },
  terms: {
    color: authColors.muted,
    fontFamily: authFonts.regular,
    fontSize: fontSizes["2xs"],
    lineHeight: 16,
    textAlign: "center",
    letterSpacing: 0,
  },
  termsLink: {
    color: authColors.brand,
    fontFamily: authFonts.medium,
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
