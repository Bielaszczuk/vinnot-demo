import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useVerifyEmailAction } from "@/presentation/hooks/useAccountActions";
import { VerificationStatusScreenView } from "@/presentation/features/auth";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const { isLoading, message, error } = useVerifyEmailAction(
    token,
    token ? t("auth.accountActionError") : t("auth.missingActionToken")
  );

  return (
    <VerificationStatusScreenView
      title={t("auth.verifyEmailTitle")}
      description={t("auth.verifyEmailDescription")}
      isLoading={isLoading}
      message={message}
      error={error}
      primaryLabel={message ? t("auth.signIn") : t("common.back")}
      onPrimary={() => router.replace("/(auth)/login")}
    />
  );
}
