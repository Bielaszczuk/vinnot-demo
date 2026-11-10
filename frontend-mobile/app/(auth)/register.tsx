/**
 * Register route container.
 * Keeps registration flow logic and delegates UI composition to presentation feature.
 */
import { useLegalAgreement } from "@/presentation/hooks/useLegalAgreement";
import { TermsReview } from "@/presentation/features/public/TermsReview";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useToast } from "@/presentation/providers/ToastProvider";
import { useAccountActions } from "@/presentation/hooks/useAccountActions";
import type { SocialProvider } from "@/domain/user/social-provider";
import {
  registerUserSchema,
  type RegisterUserInput,
} from "@/domain/user/user.validators";
import { AuthApiError, AuthValidationError, RegisterScreenView } from "@/presentation/features/auth";

export default function RegisterScreen() {
  const router = useRouter();
  const agreement = useLegalAgreement("registration");
  const { t } = useTranslation();
  const { register: registerUser, socialLogin, isAuthenticated, user, returnPath, clearReturnPath } = useAuth();
  const { acquireSocialCredential } = useAccountActions();
  const { showSuccess } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<SocialProvider | null>(null);
  const leavingAfterAuthentication = useRef(false);

  const {
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterUserInput>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  const passwordValue = watch("password");

  useEffect(() => {
    if (!isAuthenticated || leavingAfterAuthentication.current) return;
    leavingAfterAuthentication.current = true;
    router.replace((
      user?.onboardingCompleted === false
        ? "/(app)/complete-profile"
        : returnPath ?? "/(app)/(tabs)/home"
    ) as Href);
    if (user?.onboardingCompleted !== false) clearReturnPath?.();
  }, [isAuthenticated, router, user?.onboardingCompleted, returnPath, clearReturnPath]);

  const onSubmit = async (data: RegisterUserInput) => {
    setServerError(null);
    if (!agreement.selection || agreement.error) return;
    try {
      const result = await registerUser(
        data.username.trim(),
        data.email.trim(),
        data.password,
        data.firstName.trim(),
        data.lastName.trim(),
        agreement.selection,
      );
      showSuccess(t("auth.registerSuccess"));
      router.replace({
        pathname: "/(auth)/register-success",
        params: { email: result.email },
      });
    } catch (error) {
      if (error instanceof AuthValidationError) {
        for (const [field, msgs] of Object.entries(error.fieldErrors)) {
          if (msgs.length > 0 && field in (data as object)) {
            setError(field as keyof RegisterUserInput, {
              type: "server",
              message: msgs[0],
            });
          }
        }
        setServerError(error.message);
      } else if (error instanceof AuthApiError) {
        if (error.code === "TERMS_VERSION_CHANGED") agreement.retry();
        setServerError(error.message);
      } else {
        setServerError(t("auth.registerError"));
      }
    }
  };

  const onSocial = async (provider: SocialProvider) => {
    setServerError(null);
    setBusyProvider(provider);
    try {
      const request = await acquireSocialCredential(provider);
      const result = await socialLogin(request);
      showSuccess(t("auth.registerSuccess"));
      router.replace((
        result.user.onboardingCompleted
          ? "/(app)/(tabs)/home"
          : "/(app)/complete-profile"
      ) as Href);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : t("auth.socialLoginError")
      );
    } finally {
      setBusyProvider(null);
    }
  };

  const submitForm = handleSubmit(onSubmit);

  return (
    <RegisterScreenView
      terms={<TermsReview agreement={agreement} />}
      termsReady={!!agreement.selection && !agreement.error}
      control={control}
      errors={errors}
      isSubmitting={isSubmitting}
      busyProvider={busyProvider}
      serverError={serverError}
      passwordValue={passwordValue}
      onSubmit={submitForm}
      onSocial={onSocial}
    />
  );
}
