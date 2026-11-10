import { authClient } from '@api/clients/auth.client'
import { mapUserFromDto } from '@domain/user/user.mappers'
import type { User } from '@domain/user/user.types'
import type {
  LoginRequestDto,
  RegisterRequestDto,
  SocialLoginRequestDto,
  AuthResponseDto,
  PasswordResetTokenStatusDto,
  PasswordResetTokenStatusResponseDto,
} from '@api/dto/auth.dto'
import { isHttpError } from '@infrastructure/http/errors'
import { normalizeFieldErrors } from '@shared/utils/apiError'
import { isLogoutPending } from '@infrastructure/http/browserSession'

export const hasPendingBrowserLogout = isLogoutPending

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthResult {
  user: User
  tokens: AuthTokens
}

export interface RegistrationResult {
  userId: string
  email: string
  emailVerificationRequired: boolean
  message: string
}

export interface SocialLoginRequest {
  provider: 'GOOGLE' | 'APPLE' | 'FACEBOOK'
  token: string
  nonce?: string
  firstName?: string
  lastName?: string
  /** Reactivates a deactivated account once the identity is verified. */
  reactivate?: boolean
}

export type PasswordResetTokenStatus = PasswordResetTokenStatusDto

const TERMINAL_SESSION_CODES = new Set([
  'INVALID_TOKEN',
  'ACCOUNT_DISABLED',
  'ACCOUNT_DEACTIVATED',
  'ACCOUNT_LOCKED',
  'EMAIL_NOT_VERIFIED',
  'USER_NOT_FOUND',
])

/**
 * Auth validation error class
 */
export class AuthValidationError extends Error {
  public readonly fieldErrors: Record<string, string[]>

  constructor(message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'AuthValidationError'
    this.fieldErrors = fieldErrors
  }
}

/**
 * Auth API error class
 */
export class AuthApiError extends Error {
  public readonly statusCode: number
  public readonly isSessionExpired: boolean
  public readonly code?: string

  constructor(
    message: string,
    statusCode: number = 500,
    isSessionExpired: boolean = false,
    code?: string,
  ) {
    super(message)
    this.name = 'AuthApiError'
    this.statusCode = statusCode
    this.isSessionExpired = isSessionExpired
    this.code = code
  }
}


/**
 * Authentication service with validation
 */
export const authService = {
  /**
   * Login user with email/username and password
   * @throws AuthValidationError if validation fails
   * @throws AuthApiError if API call fails
   */
  async login(usernameOrEmail: string, password: string, reactivate = false): Promise<AuthResult> {

    if (!usernameOrEmail || !password) {
      throw new AuthValidationError('Invalid login credentials', {
        usernameOrEmail: !usernameOrEmail ? ['Email or username is required'] : [],
        password: !password ? ['Password is required'] : [],
      })
    }

    try {
      const data: LoginRequestDto = reactivate
        ? { usernameOrEmail, password, reactivate: true }
        : { usernameOrEmail, password }
      const response = await authClient.login(data)

      return mapAuthResponse(response)
    } catch (error: unknown) {
      if (isHttpError(error)) {
        if (error.status === 401) {
          throw new AuthApiError('Invalid email or password', 401, false, error.code)
        }

        const message = error.code === 'EMAIL_NOT_VERIFIED'
          ? 'Verificá tu correo antes de iniciar sesión.'
          : error.message || 'Login failed'

        if (error.status === 422 && error.details) {
          throw new AuthValidationError(message, normalizeFieldErrors(error.details))
        }
        throw new AuthApiError(message, error.status, false, error.code)
      }
      throw new AuthApiError('Network error. Please check your connection.', 0, false)
    }
  },

  /**
   * Register a new user
   * @throws AuthValidationError if validation fails
   * @throws AuthApiError if API call fails
   */
  async register(
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    termsAcceptance?: import('@/domain/legal/agreement').TermsSelection,
  ): Promise<RegistrationResult> {

    if (!username || !email || !password) {
      throw new AuthValidationError('Invalid registration data', {
        username: !username ? ['Username is required'] : [],
        email: !email ? ['Email is required'] : [],
        password: !password ? ['Password is required'] : [],
      })
    }

    try {
      const data: RegisterRequestDto = { username, email, password, firstName, lastName, ...(termsAcceptance ? { termsAcceptance } : {}) }
      const response = await authClient.register(data)

      return response
    } catch (error: unknown) {
      if (isHttpError(error)) {
        const message = error.message || 'Registration failed'
        if (error.status === 422 && error.details) {
          throw new AuthValidationError(message, normalizeFieldErrors(error.details))
        }
        throw new AuthApiError(message, error.status, false, error.code)
      }
      throw new AuthApiError('Network error. Please check your connection.', 0)
    }
  },

  async socialLogin(request: SocialLoginRequest): Promise<AuthResult> {
    try {
      const data: SocialLoginRequestDto = request
      return mapAuthResponse(await authClient.socialLogin(data))
    } catch (error: unknown) {
      throw mapAuthApiError(error, 'No se pudo iniciar sesión con el proveedor seleccionado.')
    }
  },

  async forgotPassword(email: string): Promise<string> {
    try {
      return (await authClient.forgotPassword({ email })).message
    } catch (error: unknown) {
      throw mapAuthApiError(error, 'No se pudo solicitar el cambio de clave.')
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<string> {
    try {
      return (await authClient.resetPassword({ token, newPassword })).message
    } catch (error: unknown) {
      throw mapAuthApiError(error, 'El enlace no es válido o ya venció.')
    }
  },

  async validatePasswordResetToken(
    token: string,
  ): Promise<PasswordResetTokenStatusResponseDto> {
    try {
      return await authClient.validatePasswordResetToken(token)
    } catch (error: unknown) {
      throw mapAuthApiError(error, 'No se pudo validar el enlace de recuperación.')
    }
  },

  async verifyEmail(token: string): Promise<string> {
    try {
      return (await authClient.verifyEmail({ token })).message
    } catch (error: unknown) {
      throw mapAuthApiError(error, 'El enlace de verificación no es válido o ya venció.')
    }
  },

  async confirmEmailChange(token: string): Promise<string> {
    try {
      return (await authClient.confirmEmailChange({ token })).message
    } catch (error: unknown) {
      throw mapAuthApiError(error, 'No se pudo confirmar el cambio de correo.')
    }
  },

  async resendVerification(email: string): Promise<string> {
    try {
      return (await authClient.resendVerificationEmail({ email })).message
    } catch (error: unknown) {
      throw mapAuthApiError(error, 'No se pudo reenviar el correo de verificación.')
    }
  },

  /** Restore a cookie session, or report normal anonymous startup without an error. */
  async restoreSession(refreshToken: string = ''): Promise<AuthTokens | null> {
    try {
      const response = await authClient.restoreSession({ refreshToken })
      if (!response) return null
      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
      }
    } catch (error: unknown) {
      throw mapSessionApiError(error, 'No se pudo restablecer la sesión.')
    }
  },

  /**
   * Refresh access token
   * @throws AuthApiError if refresh fails (session expired)
   */
  async refreshToken(refreshToken: string = ''): Promise<AuthTokens> {
    try {
      const response = await authClient.refreshToken({ refreshToken })
      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
      }
    } catch (error: unknown) {
      throw mapSessionApiError(error, 'No se pudo renovar la sesión.')
    }
  },

  /**
   * Logout user
   */
  async logout(refreshToken?: string): Promise<void> {
    try {
      await authClient.logout({ refreshToken })
    } catch (error: unknown) {
      throw mapAuthApiError(error, 'No se pudo cerrar la sesión en el servidor.')
    }
  },

  /**
   * Get current authenticated user
   * @throws AuthApiError if not authenticated or session expired
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await authClient.getCurrentUser()
      return mapUserFromDto({
        id: response.id,
        username: response.username,
        email: response.email,
        firstName: response.firstName,
        lastName: response.lastName,
        name: response.name ?? '',
        avatarUrl: response.avatarUrl,
        roles: response.roles,
        emailVerified: response.emailVerified,
        hasSocialIdentity: response.hasSocialIdentity,
        hasPassword: response.hasPassword,
        socialProviders: response.socialProviders,
        onboardingCompleted: response.onboardingCompleted,
        createdAt: response.createdAt ?? new Date().toISOString(),
        updatedAt: response.updatedAt ?? new Date().toISOString(),
      })
    } catch (error: unknown) {
      throw mapSessionApiError(error, 'No se pudo recuperar el usuario.')
    }
  },
}

function mapAuthResponse(response: AuthResponseDto): AuthResult {
  return {
    user: mapUserFromDto({
      id: response.user.id,
      username: response.user.username,
      email: response.user.email,
      firstName: response.user.firstName,
      lastName: response.user.lastName,
      name: response.user.name ?? '',
      avatarUrl: response.user.avatarUrl,
      roles: response.user.roles,
      emailVerified: response.user.emailVerified,
      hasSocialIdentity: response.user.hasSocialIdentity,
      hasPassword: response.user.hasPassword,
      socialProviders: response.user.socialProviders,
      onboardingCompleted: response.user.onboardingCompleted,
      createdAt: response.user.createdAt ?? new Date().toISOString(),
      updatedAt: response.user.updatedAt ?? new Date().toISOString(),
    }),
    tokens: {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
    },
  }
}

function mapAuthApiError(error: unknown, fallback: string): AuthApiError {
  if (isHttpError(error)) {
    return new AuthApiError(
      error.message || fallback,
      error.status,
      false,
      error.code,
    )
  }
  return new AuthApiError('Error de red. Verificá tu conexión.', 0)
}

function mapSessionApiError(error: unknown, fallback: string): AuthApiError {
  if (isHttpError(error)) {
    const isSessionExpired =
      error.status === 401 ||
      error.status === 403 ||
      TERMINAL_SESSION_CODES.has(error.code)

    return new AuthApiError(
      isSessionExpired
        ? 'La sesión venció. Volvé a iniciar sesión.'
        : error.message || fallback,
      error.status,
      isSessionExpired,
      error.code,
    )
  }

  return new AuthApiError('Error de red. Verificá tu conexión.', 0, false)
}

export default authService
