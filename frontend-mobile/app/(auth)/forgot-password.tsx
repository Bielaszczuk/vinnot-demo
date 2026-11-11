import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useAccountActions } from "@/presentation/hooks/useAccountActions";
import { emailActionSchema, type EmailActionInput } from "@/domain/user/user.validators";
import { AUTH_ERROR_MESSAGES } from "@/domain/user/auth.messages";
import { errorMessageKey } from "@/shared/i18n/localizeMessage";
import { ForgotPasswordScreenView } from "@/presentation/features/auth";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword } = useAccountActions();
  const [message, setMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmailActionInput>({
    resolver: zodResolver(emailActionSchema),
    defaultValues: { email: "" },
  });

  const submit = handleSubmit(async ({ email }) => {
    setMessage(null);
    setServerError(null);
    try {
      setMessage(await forgotPassword(email.trim()));
    } catch (error) {
      setServerError(errorMessageKey(error, AUTH_ERROR_MESSAGES.forgotPasswordFailed));
    }
  });

  return (
    <ForgotPasswordScreenView
      control={control}
      errors={errors}
      isSubmitting={isSubmitting}
      message={message}
      error={serverError}
      onSubmit={submit}
      onBack={() => router.replace("/(auth)/login")}
    />
  );
}
