/**
 * Login route container.
 * Keeps auth flow logic and delegates UI composition to presentation feature.
 */
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { errorMessageKey } from "@/shared/i18n/localizeMessage";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useToast } from "@/presentation/providers/ToastProvider";
import { useAccountActions } from "@/presentation/hooks/useAccountActions";
import type { SocialProvider } from "@/domain/user/social-provider";
import { loginUserSchema, type LoginUserInput } from "@/domain/user/user.validators";
import { AuthApiError, AuthValidationError, LoginScreenView } from "@/presentation/features/auth";
import type { AuthResult, SocialLoginRequest } from "@/presentation/features/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { login, socialLogin, isAuthenticated, user, returnPath, clearReturnPath } = useAuth();
  const { acquireSocialCredential } = useAccountActions();
  const { showSuccess } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<SocialProvider | null>(null);
  const interactiveAuthentication = useRef(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginUserInput>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!isAuthenticated || interactiveAuthentication.current) return;
    interactiveAuthentication.current = true;
    router.replace(
      (user?.onboardingCompleted === false
        ? "/(app)/complete-profile"
        : returnPath ?? "/(app)/(tabs)/home") as Href,
    );
    if (user?.onboardingCompleted !== false) clearReturnPath?.();
  }, [isAuthenticated, router, user?.onboardingCompleted, returnPath, clearReturnPath]);

  const finishLogin = (result: AuthResult) => {
    showSuccess(t("auth.loginSuccess"));
    router.replace(
      (result.user.onboardingCompleted ? returnPath ?? "/(app)/(tabs)/home" : "/(app)/complete-profile") as Href,
    );
    if (result.user.onboardingCompleted) clearReturnPath?.();
  };

  const confirmReactivation = (onConfirm: () => Promise<AuthResult>) => {
    Alert.alert(t("auth.reactivateAccountTitle"), t("auth.reactivateAccountMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("auth.reactivateAccountAction"),
        onPress: () => {
          void onConfirm().then(finishLogin, (error) => {
            interactiveAuthentication.current = false;
            setServerError(errorMessageKey(error, t("auth.loginError")));
          });
        },
      },
    ]);
  };

  const onSubmit = async (data: LoginUserInput) => {
    setServerError(null);
    interactiveAuthentication.current = true;
    let authenticated: AuthResult;
    try {
      authenticated = await login(data.email.trim(), data.password);
    } catch (error) {
      if (error instanceof AuthValidationError) {
        interactiveAuthentication.current = false;
        for (const [field, msgs] of Object.entries(error.fieldErrors)) {
          if (msgs.length > 0 && (field === "email" || field === "password")) {
            setError(field as keyof LoginUserInput, {
              type: "server",
              message: msgs[0],
            });
          }
        }
        setServerError(error.message);
      } else if (error instanceof AuthApiError) {
        if (error.code === "EMAIL_NOT_VERIFIED") {
          interactiveAuthentication.current = false;
          router.push({
            pathname: "/(auth)/register-success",
            params: { email: data.email.trim() },
          });
          return;
        }
        if (error.code === "ACCOUNT_DEACTIVATED") {
          confirmReactivation(() => login(data.email.trim(), data.password, true));
          return;
        }
        interactiveAuthentication.current = false;
        setServerError(error.message);
      } else {
        interactiveAuthentication.current = false;
        setServerError(errorMessageKey(error, t("auth.loginError")));
      }
      return;
    }
    finishLogin(authenticated);
  };

  const onSocial = async (provider: SocialProvider) => {
    setServerError(null);
    setBusyProvider(provider);
    interactiveAuthentication.current = true;
    let request: SocialLoginRequest | null = null;
    let authenticated: AuthResult | null = null;
    try {
      request = await acquireSocialCredential(provider);
      authenticated = await socialLogin(request);
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "ACCOUNT_DEACTIVATED" && request) {
        const verifiedRequest = request;
        confirmReactivation(() =>
          socialLogin({
            ...verifiedRequest,
            reactivate: true,
          }),
        );
        return;
      }
      interactiveAuthentication.current = false;
      setServerError(errorMessageKey(error, t("auth.socialLoginError")));
    } finally {
      setBusyProvider(null);
    }
    if (authenticated) finishLogin(authenticated);
  };

  const submitForm = handleSubmit(onSubmit);

  return (
    <LoginScreenView
      control={control}
      errors={errors}
      isSubmitting={isSubmitting}
      busyProvider={busyProvider}
      serverError={serverError}
      onSubmit={submitForm}
      onSocial={onSocial}
      onForgotPassword={() => router.push("/(auth)/forgot-password")}
    />
  );
}
