/**
 * Authentication DTOs
 *
 * Data Transfer Objects for authentication API endpoints.
 * These represent the exact shape of data sent to/from the backend.
 * Note: Backend uses camelCase for all JSON fields.
 */





/**
 * Login request payload
 * Backend accepts username OR email in usernameOrEmail field
 */
export interface LoginRequestDto {
  usernameOrEmail: string
  password: string
  /** Reactivates a deactivated account on a successful sign-in. */
  reactivate?: boolean
}

/**
 * Registration request payload
 */
export interface RegisterRequestDto {
  termsAcceptance?: import('./legal.dto').TermsSelectionDto
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
  name?: string
}

/**
 * Token refresh request payload
 */
export interface RefreshTokenRequestDto {
  refreshToken: string
}

export interface LogoutRequestDto {
  refreshToken?: string
}

/**
 * Password reset request
 */
export interface ForgotPasswordRequestDto {
  email: string
}

/**
 * Reset password with token
 */
export interface ResetPasswordRequestDto {
  token: string
  newPassword: string
}

export type PasswordResetTokenStatusDto = 'VALID' | 'USED' | 'EXPIRED' | 'INVALID'

export interface PasswordResetTokenStatusResponseDto {
  valid: boolean
  status: PasswordResetTokenStatusDto
}

/**
 * Email verification request
 */
export interface VerifyEmailRequestDto {
  token: string
}

export interface ResendVerificationRequestDto {
  email: string
}

export type SocialProviderDto = 'GOOGLE' | 'APPLE' | 'FACEBOOK'

/** POST /auth/reauthenticate accepts exactly one credential. */
export type ReauthenticationRequestDto =
  | { password: string }
  | { provider: 'GOOGLE' | 'APPLE'; token: string; nonce?: string }

export interface SocialLoginRequestDto {
  provider: SocialProviderDto
  token: string
  nonce?: string
  firstName?: string
  lastName?: string
  reactivate?: boolean
}

export interface RegistrationResponseDto {
  message: string
  userId: string
  email: string
  emailVerificationRequired: boolean
}



/**
 * Authentication response (login/register)
 * Backend returns camelCase fields
 */
export interface AuthResponseDto {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
  user: AuthUserDto
}

/** Wire contract for browser sessions; refresh is delivered only through Set-Cookie. */
export type BrowserAuthResponseDto = Omit<AuthResponseDto, 'refreshToken'>

/**
 * Authenticated user data from backend
 */
export interface AuthUserDto {
  phoneNumber?: string | null
  id: string
  username: string
  email: string
  firstName?: string | null
  lastName?: string | null
  name: string | null
  avatarUrl?: string | null
  roles: string[]
  emailVerified: boolean
  hasSocialIdentity?: boolean
  hasPassword?: boolean
  socialProviders?: SocialProviderDto[]
  onboardingCompleted: boolean
  /** Public bio; absent on older APIs. */
  bio?: string | null
  /** Who can see the cellar; absent on older APIs (public). */
  cellarVisibility?: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'
  createdAt?: string
  updatedAt?: string
}

/**
 * Token refresh response
 */
export interface RefreshTokenResponseDto {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * Current user response (GET /auth/me)
 */
export interface MeResponseDto extends AuthUserDto {
  createdAt: string
  updatedAt: string
}

/**
 * Generic success response
 */
export interface AuthMessageResponseDto {
  message: string
}
