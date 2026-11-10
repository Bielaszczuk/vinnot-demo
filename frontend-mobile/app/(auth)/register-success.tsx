import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAccountActions } from "@/presentation/hooks/useAccountActions";
import { VerificationStatusScreenView } from "@/presentation/features/auth";

export default function RegistrationPendingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { resendVerification } = useAccountActions();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === "string" ? params.email : "";
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(email ? null : t("auth.missingVerificationEmail"));

  const resend = async () => {
    if (!email || isLoading) return;
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      setMessage(await resendVerification(email));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("auth.accountActionError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VerificationStatusScreenView
      title={t("auth.checkEmailTitle")}
      description={t("auth.checkEmailDescription", { email })}
      isLoading={isLoading}
      message={message}
      error={error}
      primaryLabel={t("auth.resendVerification")}
      onPrimary={() => void resend()}
      secondaryLabel={t("auth.backToLogin")}
      onSecondary={() => router.replace("/(auth)/login")}
    />
  );
}
