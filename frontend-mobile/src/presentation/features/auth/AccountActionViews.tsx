import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { CircleCheck, Mail, TriangleAlert } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { localizeMessage } from "@/shared/i18n/localizeMessage";
import type { EmailActionInput, ResetPasswordInput } from "@/domain/user/user.validators";
import { AuthButton } from "./AuthButton";
import { AuthLayout } from "./AuthLayout";
import { AuthTextField } from "./AuthTextField";
import { PasswordStrengthBar } from "./PasswordStrengthBar";
import { authColors, authFonts } from "./authTheme";
import { BackButton } from "@/presentation/components/ui/BackButton";
import { fontSizes } from "@/shared/theme/typography";
import { iconStrokes, radii, lightTokens } from "@/shared/theme/tokens";

type MessageProps = {
  kind: "error" | "success";
  children: ReactNode;
};

function ActionMessage({ kind, children }: MessageProps) {
  const { t } = useTranslation();
  const isError = kind === "error";
  const content = typeof children === "string" ? localizeMessage(t, children) : children;

  return (
    <View style={[styles.message, isError ? styles.errorMessage : styles.successMessage]}>
      {isError ? (
        <TriangleAlert size={18} color={authColors.danger} />
      ) : (
        <CircleCheck size={18} color={authColors.success} />
      )}
      <Text style={[styles.messageText, isError ? styles.errorText : styles.successText]}>
        {content}
      </Text>
    </View>
  );
}

function MailBadge() {
  return (
    <View style={styles.iconBadge}>
      <Mail size={25} color={authColors.brand} strokeWidth={iconStrokes.thin} />
    </View>
  );
}

type EmailActionProps = {
  control: Control<EmailActionInput>;
  errors: FieldErrors<EmailActionInput>;
  isSubmitting: boolean;
  message: string | null;
  error: string | null;
  onSubmit: () => void;
  onBack: () => void;
};

export function ForgotPasswordScreenView({
  control,
  errors,
  isSubmitting,
  message,
  error,
  onSubmit,
  onBack,
}: EmailActionProps) {
  const { t } = useTranslation();

  return (
    <AuthLayout
      heroTitle={t("auth.forgotPasswordTitle")}
      heroSubtitle={t("auth.forgotPasswordDescription")}
    >
      <BackButton onPress={onBack} />
      <MailBadge />
      {message ? <ActionMessage kind="success">{message}</ActionMessage> : null}
      {error ? <ActionMessage kind="error">{error}</ActionMessage> : null}
      {!message ? (
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
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={onSubmit}
                error={localizeMessage(t, errors.email?.message)}
              />
            )}
          />
          <AuthButton onPress={onSubmit} loading={isSubmitting} disabled={isSubmitting}>
            {t("auth.sendRecoveryEmail")}
          </AuthButton>
        </View>
      ) : null}
    </AuthLayout>
  );
}

type ResetPasswordProps = {
  control: Control<ResetPasswordInput>;
  errors: FieldErrors<ResetPasswordInput>;
  passwordValue: string;
  isSubmitting: boolean;
  message: string | null;
  error: string | null;
  /** The link is still being checked; the form waits for the result. */
  isCheckingLink?: boolean;
  /** The link is missing, expired, used or invalid; only a new one helps. */
  linkUnavailable?: boolean;
  onSubmit: () => void;
  onRequestNewLink?: () => void;
  onBack: () => void;
};

export function ResetPasswordScreenView({
  control,
  errors,
  passwordValue,
  isSubmitting,
  message,
  error,
  isCheckingLink = false,
  linkUnavailable = false,
  onSubmit,
  onRequestNewLink,
  onBack,
}: ResetPasswordProps) {
  const { t } = useTranslation();

  return (
    <AuthLayout
      heroTitle={t("auth.resetPasswordTitle")}
      heroSubtitle={t("auth.resetPasswordDescription")}
    >
      <BackButton onPress={onBack} />
      {message ? <ActionMessage kind="success">{message}</ActionMessage> : null}
      {error ? <ActionMessage kind="error">{error}</ActionMessage> : null}
      {isCheckingLink ? <Text style={styles.checkingText}>{t("auth.validatingResetLink")}</Text> : null}
      {linkUnavailable && onRequestNewLink ? (
        <AuthButton onPress={onRequestNewLink}>{t("auth.requestNewResetLink")}</AuthButton>
      ) : null}
      {!message && !isCheckingLink && !linkUnavailable ? (
        <View style={styles.fields}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthTextField
                label={t("auth.newPassword")}
                icon="lock"
                placeholder="••••••••"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                textContentType="newPassword"
                error={localizeMessage(t, errors.password?.message)}
              />
            )}
          />
          {!errors.password?.message ? <PasswordStrengthBar value={passwordValue} /> : null}
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
                textContentType="newPassword"
                onSubmitEditing={onSubmit}
                error={localizeMessage(t, errors.confirmPassword?.message)}
              />
            )}
          />
          <AuthButton onPress={onSubmit} loading={isSubmitting} disabled={isSubmitting}>
            {t("auth.updatePassword")}
          </AuthButton>
        </View>
      ) : null}
    </AuthLayout>
  );
}

type VerificationProps = {
  title: string;
  description: string;
  isLoading?: boolean;
  message?: string | null;
  error?: string | null;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function VerificationStatusScreenView({
  title,
  description,
  isLoading = false,
  message,
  error,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: VerificationProps) {
  return (
    <AuthLayout heroTitle={title} heroSubtitle={description}>
      <MailBadge />
      {message ? <ActionMessage kind="success">{message}</ActionMessage> : null}
      {error ? <ActionMessage kind="error">{error}</ActionMessage> : null}
      <View style={styles.fields}>
        <AuthButton onPress={onPrimary} loading={isLoading} disabled={isLoading}>
          {primaryLabel}
        </AuthButton>
        {secondaryLabel && onSecondary ? (
          <AuthButton onPress={onSecondary} disabled={isLoading} variant="outline">
            {secondaryLabel}
          </AuthButton>
        ) : null}
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 17,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: authColors.brandSoft,
    borderWidth: 1,
    borderColor: lightTokens.brandSecondaryStrong,
    marginVertical: 24,
  },
  message: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 17,
  },
  errorMessage: {
    backgroundColor: authColors.dangerSoft,
    borderColor: lightTokens.dangerBorder,
  },
  successMessage: {
    backgroundColor: authColors.successSoft,
    borderColor: lightTokens.successBorder,
  },
  messageText: {
    flex: 1,
    fontFamily: authFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    letterSpacing: 0,
  },
  errorText: {
    color: authColors.danger,
  },
  successText: {
    color: authColors.success,
  },
  checkingText: {
    color: authColors.muted,
    fontFamily: authFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    letterSpacing: 0,
    marginBottom: 17,
  },
});
