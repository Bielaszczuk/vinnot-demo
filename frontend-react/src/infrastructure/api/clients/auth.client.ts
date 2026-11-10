/**
 * Authentication API Client
 *
 * Handles all authentication-related API calls.
 * Uses the configured axios instance for automatic token handling.
 * Note: Backend returns data directly (no wrapper).
 */

import http from '@infrastructure/http/http'
import { HttpError } from '@infrastructure/http/errors'
import { resolveApiAssetUrl } from '@infrastructure/http/resolveApiAssetUrl'
import { API_ENDPOINTS } from '@config/constants'
import { exclusiveSession, isLogoutPending, notifySession, setLogoutPending } from '@infrastructure/http/browserSession'
import type {
  LoginRequestDto,
  RegisterRequestDto,
  RefreshTokenRequestDto,
  LogoutRequestDto,
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
  VerifyEmailRequestDto,
  ResendVerificationRequestDto,
  SocialLoginRequestDto,
  AuthResponseDto,
  BrowserAuthResponseDto,
  RegistrationResponseDto,
  RefreshTokenResponseDto,
  MeResponseDto,
  AuthMessageResponseDto,
  PasswordResetTokenStatusResponseDto,
  ReauthenticationRequestDto,
} from '@api/dto/auth.dto'

/**
 * Authentication API client
 */
export const authClient = {
  async reauthenticate(credential: ReauthenticationRequestDto): Promise<{ proof: string }> {
    return (await http.post<{ proof: string }>('/auth/reauthenticate', credential)).data
  },
  /**
   * Login with email/username and password
   * @param data Login credentials
   * @returns Auth tokens and user data
   */
  async login(data: LoginRequestDto): Promise<AuthResponseDto> {
    return exclusiveSession(async () => {
      const response = await http.post<BrowserAuthResponseDto>(`${API_ENDPOINTS.AUTH.BASE}/web/login`, data, browserConfig)
      setLogoutPending(false)
      notifySession('signed-in')
      return normalizeAuthResponse(response.data)
    })
  },

  /**
   * Register a new user
   * @param data Registration data
   * @returns Auth tokens and user data
   */
  async register(data: RegisterRequestDto): Promise<RegistrationResponseDto> {
    const response = await http.post<RegistrationResponseDto>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    )
    return response.data
  },

  async socialLogin(data: SocialLoginRequestDto): Promise<AuthResponseDto> {
    return exclusiveSession(async () => {
      const response = await http.post<BrowserAuthResponseDto>(`${API_ENDPOINTS.AUTH.BASE}/web/social`, data, browserConfig)
      setLogoutPending(false)
      notifySession('signed-in')
      return normalizeAuthResponse(response.data)
    })
  },

  /**
   * Refresh access token using refresh token
   * @param data Refresh token
   * @returns New access token
   */
  async refreshToken(data: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
    const response = await authClient.restoreSession(data)
    if (!response) throw new HttpError(401, 'INVALID_TOKEN', 'No active browser session')
    return response
  },

  /** Optional startup probe; 204 means an ordinary anonymous browser. */
  async restoreSession(data: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto | null> {
    return exclusiveSession(async () => {
      if (isLogoutPending()) throw new Error('Session restoration disabled after logout')
      const response = await http.post<BrowserAuthResponseDto>(`${API_ENDPOINTS.AUTH.BASE}/web/refresh`,
        data.refreshToken ? data : undefined, browserConfig)
      if (response.status === 204) return null
      return { ...response.data, refreshToken: '' }
    })
  },

  /**
   * Logout current user (invalidate tokens)
   */
  async logout(data: LogoutRequestDto = {}): Promise<void> {
    setLogoutPending(true)
    notifySession('signed-out')
    return exclusiveSession(async () => {
      setLogoutPending(true)
      await http.post(`${API_ENDPOINTS.AUTH.BASE}/web/logout`, data.refreshToken ? data : undefined, browserConfig)
      setLogoutPending(false)
    })
  },

  /**
   * Get current authenticated user
   * @returns Current user data with preferences
   */
  async getCurrentUser(): Promise<MeResponseDto> {
    const response = await http.get<MeResponseDto>(API_ENDPOINTS.AUTH.ME)
    return {
      ...response.data,
      avatarUrl: resolveApiAssetUrl(response.data.avatarUrl),
    }
  },

  /**
   * Request password reset email
   * @param data Email address
   */
  async forgotPassword(data: ForgotPasswordRequestDto): Promise<AuthMessageResponseDto> {
    const response = await http.post<AuthMessageResponseDto>(
      `${API_ENDPOINTS.AUTH.BASE}/forgot-password`,
      data
    )
    return response.data
  },

  /**
   * Reset password with token
   * @param data New password and reset token
   */
  async resetPassword(data: ResetPasswordRequestDto): Promise<AuthMessageResponseDto> {
    const response = await http.post<AuthMessageResponseDto>(
      `${API_ENDPOINTS.AUTH.BASE}/reset-password`,
      data
    )
    return response.data
  },

  async validatePasswordResetToken(
    token: string,
  ): Promise<PasswordResetTokenStatusResponseDto> {
    const response = await http.post<PasswordResetTokenStatusResponseDto>(
      `${API_ENDPOINTS.AUTH.BASE}/reset-password/validate`,
      { token },
    )
    return response.data
  },

  /**
   * Verify email address
   * @param data Verification token
   */
  async verifyEmail(data: VerifyEmailRequestDto): Promise<AuthMessageResponseDto> {
    const response = await http.post<AuthMessageResponseDto>(
      `${API_ENDPOINTS.AUTH.BASE}/verify-email`,
      data
    )
    return response.data
  },

  async confirmEmailChange(data: VerifyEmailRequestDto): Promise<AuthMessageResponseDto> {
    const response = await http.post<AuthMessageResponseDto>(
      `${API_ENDPOINTS.AUTH.BASE}/email-change/confirm`,
      data,
    )
    return response.data
  },

  /**
   * Resend verification email
   */
  async resendVerificationEmail(
    data: ResendVerificationRequestDto,
  ): Promise<AuthMessageResponseDto> {
    const response = await http.post<AuthMessageResponseDto>(
      `${API_ENDPOINTS.AUTH.BASE}/resend-verification`,
      data,
    )
    return response.data
  },
}

function normalizeAuthResponse(response: BrowserAuthResponseDto): AuthResponseDto {
  return {
    ...response,
    refreshToken: '',
    user: {
      ...response.user,
      avatarUrl: resolveApiAssetUrl(response.user.avatarUrl),
    },
  }
}

const browserConfig = { withCredentials: true, headers: { 'X-Vinnot-Web-Session': '1' } }

export default authClient
