/**
 * Authentication error messages as translation keys. Application errors carry
 * these keys and presentation translates them for the active locale.
 */
export const AUTH_ERROR_MESSAGES = {
  invalidCredentials: "authErrors.invalidCredentials",
  emailNotVerified: "authErrors.emailNotVerified",
  temporarilyLocked: "authErrors.temporarilyLocked",
  offline: "authErrors.offline",
  refreshFailed: "authErrors.refreshFailed",
  sessionExpired: "authErrors.sessionExpired",
  invalidData: "authErrors.invalidData",
  invalidRegistrationData: "authErrors.invalidRegistrationData",
  loginFailed: "authErrors.loginFailed",
  registerFailed: "authErrors.registerFailed",
  socialLoginFailed: "authErrors.socialLoginFailed",
  forgotPasswordFailed: "authErrors.forgotPasswordFailed",
  resetLinkInvalid: "authErrors.resetLinkInvalid",
  resetLinkUsed: "authErrors.resetLinkUsed",
  resetLinkExpired: "authErrors.resetLinkExpired",
  termsVersionChanged: "authErrors.termsVersionChanged",
  verificationLinkInvalid: "authErrors.verificationLinkInvalid",
  resendVerificationFailed: "authErrors.resendVerificationFailed",
  authenticationFailed: "authErrors.authenticationFailed",
  unexpected: "authErrors.unexpected",
} as const;

/** Translation keys for the confirmations the auth endpoints return, by backend code. */
export const AUTH_CONFIRMATION_MESSAGES: Readonly<Record<string, string>> = {
  EMAIL_VERIFIED: "authMessages.emailVerified",
  PASSWORD_RESET: "authMessages.passwordReset",
  PASSWORD_RESET_LINK_SENT: "authMessages.passwordResetLinkSent",
  VERIFICATION_EMAIL_SENT: "authMessages.verificationEmailSent",
};

/** The translated confirmation for a known code; the server's text otherwise. */
export function authConfirmationMessage(response: { code?: string | null; message: string }): string {
  return (response.code && AUTH_CONFIRMATION_MESSAGES[response.code]) || response.message;
}

export type PasswordResetLinkStatus = "VALID" | "USED" | "EXPIRED" | "INVALID";

/** Message key for a reset-password link that cannot be used, or null when it is valid. */
export function passwordResetLinkMessage(status: PasswordResetLinkStatus): string | null {
  switch (status) {
    case "VALID":
      return null;
    case "USED":
      return AUTH_ERROR_MESSAGES.resetLinkUsed;
    case "EXPIRED":
      return AUTH_ERROR_MESSAGES.resetLinkExpired;
    default:
      return AUTH_ERROR_MESSAGES.resetLinkInvalid;
  }
}
