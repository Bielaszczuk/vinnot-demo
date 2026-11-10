/**
 * Auth service — Layer 3 (Application / Business Logic).
 *
 * Responsibilities:
 *   - Validate inputs at boundary (defense in depth alongside Zod in UI).
 *   - Translate UI fields → backend DTOs (e.g. `email` → `usernameOrEmail`).
 *   - Map DTO responses → domain models.
 *   - Translate HTTP errors → typed business errors (AuthValidationError, AuthApiError).
 *
 * @contract: keep in sync with frontend-react/src/services/auth.service.ts
 */
import { authClient } from "@/infrastructure/api/clients/auth.client";
import { isApiError, isNetworkError } from "@/infrastructure/api/errors";
import { mapUserFromDto } from "@/domain/user/user.mappers";
import {
  AUTH_ERROR_MESSAGES as authErrors,
  authConfirmationMessage,
  type PasswordResetLinkStatus,
} from "@/domain/user/auth.messages";
import { USER_VALIDATION_MESSAGES as fieldErrors } from "@/domain/user/user.validators";
import type { User } from "@/domain/user/user.types";
import { AuthApiError, AuthValidationError } from "./auth.errors";
import type {
  LoginRequestDto,
  RegisterRequestDto,
  SocialLoginRequestDto,
} from "@/infrastructure/api/dto/auth.dto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

export interface RegistrationResult {
  userId: string;
  email: string;
  emailVerificationRequired: boolean;
  message: string;
}

export interface SocialLoginRequest {
  provider: "GOOGLE" | "APPLE" | "FACEBOOK";
  token: string;
  nonce?: string;
  firstName?: string;
  lastName?: string;
  reactivate?: boolean;
}

export { AuthApiError, AuthValidationError } from "./auth.errors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Backend codes whose server text is replaced by a translated message. */
const FRIENDLY_MESSAGES: Record<string, string> = {
  EMAIL_NOT_VERIFIED: authErrors.emailNotVerified,
  TERMS_VERSION_CHANGED: authErrors.termsVersionChanged,
  ACCOUNT_TEMPORARILY_LOCKED: authErrors.temporarilyLocked,
};

/**
 * Standard mapping for transport errors to typed authentication errors.
 * Mirrors the web service behaviour 1:1.
 */
function mapAuthHttpError(error: unknown, fallbackMessage: string): never {
  if (isApiError(error)) {
    const message = error.message || fallbackMessage;

    if (error.status === 401) {
      throw new AuthApiError(authErrors.invalidCredentials, 401, false);
    }
    if (error.isValidation && error.details && typeof error.details === "object") {
      throw new AuthValidationError(message, error.details as Record<string, string[]>);
    }
    const friendlyMessage = (error.code && FRIENDLY_MESSAGES[error.code]) || message;
    throw new AuthApiError(friendlyMessage, error.status, false, error.code);
  }

  if (isNetworkError(error)) {
    throw new AuthApiError(authErrors.offline, 0, false);
  }

  throw new AuthApiError(authErrors.offline, 0, false);
}

const SESSION_REJECTION_CODES = new Set([
  "INVALID_TOKEN",
  "ACCOUNT_DISABLED",
  "ACCOUNT_LOCKED",
  "EMAIL_NOT_VERIFIED",
  "USER_NOT_FOUND",
]);

function isSessionRejected(status: number, code?: string): boolean {
  return (
    status === 401 ||
    status === 403 ||
    (typeof code === "string" && SESSION_REJECTION_CODES.has(code))
  );
}

function mapRefreshError(error: unknown): never {
  if (isApiError(error)) {
    const sessionRejected = isSessionRejected(error.status, error.code);
    throw new AuthApiError(
      sessionRejected ? authErrors.sessionExpired : error.message,
      error.status,
      sessionRejected,
      error.code,
    );
  }

  if (isNetworkError(error)) {
    throw new AuthApiError(authErrors.offline, 0, false);
  }

  throw new AuthApiError(authErrors.refreshFailed, 0, false);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Login. The UI passes `email` (matching web UX), the backend receives
   * `usernameOrEmail` (matching backend contract). It accepts both.
   */
  async login(usernameOrEmail: string, password: string, reactivate = false): Promise<AuthResult> {
    if (!usernameOrEmail || !password) {
      throw new AuthValidationError(authErrors.invalidData, {
        email: !usernameOrEmail ? [fieldErrors.emailRequired] : [],
        password: !password ? [fieldErrors.passwordRequired] : [],
      });
    }

    try {
      const payload: LoginRequestDto = {
        usernameOrEmail,
        password,
        reactivate: reactivate || undefined,
      };
      const response = await authClient.login(payload);
      return {
        user: mapUserFromDto(response.user),
        tokens: {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresIn: response.expiresIn,
        },
      };
    } catch (error) {
      mapAuthHttpError(error, authErrors.loginFailed);
    }
  },

  /**
   * Register. Backend requires username + email + password + firstName + lastName.
   */
  async register(
    username: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    termsAcceptance?: import('@/domain/legal/agreement').TermsSelection,
  ): Promise<RegistrationResult> {
    if (!username || !email || !password || !firstName || !lastName) {
      throw new AuthValidationError(authErrors.invalidRegistrationData, {
        username: !username ? [fieldErrors.usernameRequired] : [],
        email: !email ? [fieldErrors.emailRequired] : [],
        password: !password ? [fieldErrors.passwordRequired] : [],
        firstName: !firstName ? [fieldErrors.firstNameRequired] : [],
        lastName: !lastName ? [fieldErrors.lastNameRequired] : [],
      });
    }

    try {
      const payload: RegisterRequestDto = {
        username,
        email,
        password,
        firstName,
        lastName,
        ...(termsAcceptance ? { termsAcceptance } : {}),
      };
      const response = await authClient.register(payload);
      return response;
    } catch (error) {
      mapAuthHttpError(error, authErrors.registerFailed);
    }
  },

  async socialLogin(request: SocialLoginRequest): Promise<AuthResult> {
    try {
      const payload: SocialLoginRequestDto = request;
      const response = await authClient.socialLogin(payload);
      return {
        user: mapUserFromDto(response.user),
        tokens: {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresIn: response.expiresIn,
        },
      };
    } catch (error) {
      mapAuthHttpError(error, authErrors.socialLoginFailed);
    }
  },

  async forgotPassword(email: string): Promise<string> {
    try {
      return authConfirmationMessage(await authClient.forgotPassword({ email }));
    } catch (error) {
      mapAuthHttpError(error, authErrors.forgotPasswordFailed);
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<string> {
    try {
      return authConfirmationMessage(await authClient.resetPassword({ token, newPassword }));
    } catch (error) {
      mapAuthHttpError(error, authErrors.resetLinkInvalid);
    }
  },

  /** Checks a reset-password link so an expired or used one never shows the form. */
  async validatePasswordResetToken(token: string): Promise<PasswordResetLinkStatus> {
    try {
      return (await authClient.validatePasswordResetToken(token)).status;
    } catch (error) {
      mapAuthHttpError(error, authErrors.resetLinkInvalid);
    }
  },

  async verifyEmail(token: string): Promise<string> {
    try {
      return authConfirmationMessage(await authClient.verifyEmail({ token }));
    } catch (error) {
      mapAuthHttpError(error, authErrors.verificationLinkInvalid);
    }
  },

  async resendVerification(email: string): Promise<string> {
    try {
      return authConfirmationMessage(await authClient.resendVerificationEmail({ email }));
    } catch (error) {
      mapAuthHttpError(error, authErrors.resendVerificationFailed);
    }
  },

  /** Refresh both tokens. The backend rotates the refresh token on every use. */
  async refreshToken(refreshToken: string, rotationId?: string): Promise<AuthTokens> {
    try {
      const response = await authClient.refreshToken({ refreshToken, ...(rotationId ? { rotationId } : {}) });
      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
      };
    } catch (error) {
      mapRefreshError(error);
    }
  },

  /** Logout — silently ignores network errors since user wants to leave anyway. */
  async logout(refreshToken?: string, pushToken?: string): Promise<void> {
    try {
      await authClient.logout(refreshToken ? { refreshToken, ...(pushToken ? { pushToken } : {}) } : undefined);
    } catch {
      /* swallow — logout must always succeed locally */
    }
  },

  /** Restore session: GET /auth/me using the supplied or currently configured Bearer token. */
  async getCurrentUser(accessToken?: string): Promise<User> {
    try {
      const response = await authClient.getCurrentUser(accessToken);
      return mapUserFromDto(response);
    } catch (error) {
      if (isApiError(error)) {
        throw new AuthApiError(
          error.status === 401 ? authErrors.sessionExpired : error.message,
          error.status,
          error.status === 401,
          error.code,
        );
      }
      if (isNetworkError(error)) {
        throw new AuthApiError(authErrors.offline, 0, false);
      }
      throw new AuthApiError(authErrors.offline, 0, false);
    }
  },
};

export default authService;
