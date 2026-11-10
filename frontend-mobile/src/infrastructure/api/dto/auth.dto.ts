/**
 * Authentication DTOs — exact backend contract.
 *
 * @contract: keep in sync with frontend-react/src/api/dto/auth.dto.ts
 * @backend: com.vinnot.user.infrastructure.web.{request,response}
 *
 * Backend uses camelCase for all JSON fields.
 */

// ─── Requests ────────────────────────────────────────────────────────────────

/**
 * Login request payload.
 * Backend accepts username OR email in `usernameOrEmail` field.
 */
export interface LoginRequestDto {
  usernameOrEmail: string;
  password: string;
  reactivate?: boolean;
}

/**
 * Registration request payload.
 * `firstName`/`lastName` are required by Zod, `name` is a legacy fallback.
 */
export interface RegisterRequestDto {
  termsAcceptance?: import('./legal.dto').TermsSelectionDto;
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export interface RefreshTokenRequestDto {
  rotationId?: string;
  refreshToken: string;
}

export interface LogoutRequestDto {
  refreshToken?: string;
  /** This device's Expo push token, unregistered for the session's account. */
  pushToken?: string;
}

export interface ForgotPasswordRequestDto {
  email: string;
}

export interface ResetPasswordRequestDto {
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequestDto {
  token: string;
}

export interface ResendVerificationRequestDto {
  email: string;
}

export type SocialProviderDto = "GOOGLE" | "APPLE" | "FACEBOOK";

/** POST /auth/reauthenticate accepts exactly one credential. */
export type ReauthenticationRequestDto =
  | { password: string }
  | { provider: "GOOGLE" | "APPLE"; token: string; nonce?: string };

export interface SocialLoginRequestDto {
  provider: SocialProviderDto;
  token: string;
  nonce?: string;
  firstName?: string;
  lastName?: string;
  reactivate?: boolean;
}

// ─── Responses ───────────────────────────────────────────────────────────────

export interface AuthUserDto {
  phoneNumber?: string | null;
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name: string | null;
  profileImageUrl?: string | null;
  avatarUrl?: string | null;
  roles: string[];
  emailVerified: boolean;
  hasSocialIdentity?: boolean;
  hasPassword?: boolean;
  socialProviders?: SocialProviderDto[];
  onboardingCompleted?: boolean;
}

export interface PasswordResetTokenStatusResponseDto {
  valid: boolean;
  status: "VALID" | "USED" | "EXPIRED" | "INVALID";
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  user: AuthUserDto;
}

export interface RegistrationResponseDto {
  userId: string;
  email: string;
  emailVerificationRequired: boolean;
  message: string;
}

export interface RefreshTokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * GET /auth/me response — extends AuthUserDto with timestamps.
 */
export interface MeResponseDto extends AuthUserDto {
  createdAt: string;
  updatedAt: string;
}

export interface AuthMessageResponseDto {
  /** Stable confirmation code (for example EMAIL_VERIFIED); absent on older endpoints. */
  code?: string;
  /** English fallback text. */
  message: string;
}
