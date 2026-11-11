import { useEffect, useMemo, useReducer, useRef } from "react";
import { authService } from "@/application/services/auth.service";
import { socialAuthService } from "@/application/services/socialAuth.service";
import { passwordResetLinkMessage } from "@/domain/user/auth.messages";
import { errorMessageKey } from "@/shared/i18n/localizeMessage";

/** Presentation facade for public account actions used by Expo Router shells. */
export function useAccountActions() {
  return useMemo(
    () => ({
      acquireSocialCredential: socialAuthService.acquire,
      acquireAppleAccountDeletionCredential:
        socialAuthService.acquireAppleAccountDeletionCredential,
      forgotPassword: authService.forgotPassword,
      resetPassword: authService.resetPassword,
      verifyEmail: authService.verifyEmail,
      resendVerification: authService.resendVerification,
    }),
    [],
  );
}

export function useVerifyEmailAction(token: string, fallbackMessage: string) {
  const started = useRef(false);
  const [state, dispatch] = useReducer(
    (
      _state: { isLoading: boolean; message: string | null; error: string | null },
      action: { type: "success"; message: string } | { type: "error"; message: string },
    ) =>
      action.type === "success"
        ? { isLoading: false, message: action.message, error: null }
        : { isLoading: false, message: null, error: action.message },
    {
      isLoading: Boolean(token),
      message: null,
      error: token ? null : fallbackMessage,
    },
  );

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void authService
      .verifyEmail(token)
      .then((message) => dispatch({ type: "success", message }))
      .catch((reason: unknown) => {
        dispatch({
          type: "error",
          message: errorMessageKey(reason, fallbackMessage),
        });
      });
  }, [fallbackMessage, token]);

  return state;
}

type ResetLinkState = { isChecking: boolean; error: string | null };

/**
 * Checks a reset-password link before the form is shown, so an expired, used
 * or invalid link explains itself instead of failing on submit.
 */
export function usePasswordResetLink(
  token: string,
  missingTokenMessage: string,
): ResetLinkState {
  const started = useRef(false);
  const [state, dispatch] = useReducer(
    (_state: ResetLinkState, next: ResetLinkState) => next,
    { isChecking: Boolean(token), error: token ? null : missingTokenMessage },
  );

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void authService
      .validatePasswordResetToken(token)
      .then((status) => dispatch({ isChecking: false, error: passwordResetLinkMessage(status) }))
      .catch((reason: unknown) => {
        dispatch({
          isChecking: false,
          error: errorMessageKey(reason, missingTokenMessage),
        });
      });
  }, [missingTokenMessage, token]);

  return state;
}
