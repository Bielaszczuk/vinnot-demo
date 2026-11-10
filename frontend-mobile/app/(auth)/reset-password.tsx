import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAccountActions, usePasswordResetLink } from "@/presentation/hooks/useAccountActions";
import { resetPasswordSchema, type ResetPasswordInput } from "@/domain/user/user.validators";
import { ResetPasswordScreenView } from "@/presentation/features/auth";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { resetPassword } = useAccountActions();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const link = usePasswordResetLink(token, t("auth.missingActionToken"));
  const [message, setMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const submit = handleSubmit(async ({ password }) => {
    if (!token || link.isChecking || link.error) return;
    setMessage(null);
    setServerError(null);
    try {
      setMessage(await resetPassword(token, password));
    } catch (error) {
      setServerError(error instanceof Error ? error.message : t("auth.accountActionError"));
    }
  });

  return (
    <ResetPasswordScreenView
      control={control}
      errors={errors}
      passwordValue={watch("password")}
      isSubmitting={isSubmitting}
      message={message}
      error={link.error ?? serverError}
      isCheckingLink={link.isChecking}
      linkUnavailable={Boolean(link.error)}
      onSubmit={submit}
      onRequestNewLink={() => router.replace("/(auth)/forgot-password")}
      onBack={() => router.replace("/(auth)/login")}
    />
  );
}
