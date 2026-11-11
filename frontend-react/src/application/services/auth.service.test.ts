import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authClient } from '@api/clients/auth.client'
import { AuthApiError, AuthValidationError, authService } from './auth.service'
import { HttpError, NetworkError } from '@infrastructure/http/errors'

vi.mock('@api/clients/auth.client', () => ({
  authClient: {
    login: vi.fn(),
    register: vi.fn(),
    socialLogin: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    validatePasswordResetToken: vi.fn(),
    verifyEmail: vi.fn(),
    confirmEmailChange: vi.fn(),
    resendVerificationEmail: vi.fn(),
    refreshToken: vi.fn(),
    restoreSession: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}))

describe('authService session lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('distinguishes an anonymous browser from a restored or failed cookie session', async () => {
    vi.mocked(authClient.restoreSession).mockResolvedValueOnce(null)
    await expect(authService.restoreSession()).resolves.toBeNull()
    const tokens = { accessToken: 'access', refreshToken: '', expiresIn: 900 }
    vi.mocked(authClient.restoreSession).mockResolvedValueOnce(tokens)
    await expect(authService.restoreSession('legacy')).resolves.toEqual(tokens)
    expect(authClient.restoreSession).toHaveBeenLastCalledWith({ refreshToken: 'legacy' })
    vi.mocked(authClient.restoreSession).mockRejectedValueOnce(new NetworkError())
    await expect(authService.restoreSession()).rejects.toMatchObject({ isSessionExpired: false })
  })

  it('returns both rotated tokens from refresh', async () => {
    vi.mocked(authClient.refreshToken).mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
    })

    await expect(authService.refreshToken('old-refresh-token')).resolves.toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
    })
  })

  it('ignores malformed validation entries and preserves multiple messages per field', async () => {
    vi.mocked(authClient.login).mockRejectedValueOnce(new HttpError(422, 'VALIDATION', 'invalid', [
      null, 'invalid entry', {},
      { field: 'email', message: 'invalid format' },
      { field: 'email', message: 'not allowed' },
    ]))
    await expect(authService.login('ana', 'Password1!')).rejects.toMatchObject({
      fieldErrors: { general: ['Invalid value'], email: ['invalid format', 'not allowed'] },
    })
  })

  it('marks a rejected refresh credential as an expired session', async () => {
    vi.mocked(authClient.refreshToken).mockRejectedValue(
      new HttpError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token'),
    )

    await expect(authService.refreshToken('rejected-token')).rejects.toMatchObject({
      name: 'AuthApiError',
      statusCode: 401,
      code: 'INVALID_TOKEN',
      isSessionExpired: true,
    })
  })

  it('keeps transient refresh failures distinct from session expiration', async () => {
    vi.mocked(authClient.refreshToken).mockRejectedValue(new NetworkError())

    await expect(authService.refreshToken('valid-token')).rejects.toMatchObject({
      name: 'AuthApiError',
      statusCode: 0,
      isSessionExpired: false,
    })
  })

  it('sends the current refresh token when logging out', async () => {
    vi.mocked(authClient.logout).mockResolvedValue()

    await authService.logout('refresh-token')

    expect(authClient.logout).toHaveBeenCalledWith({ refreshToken: 'refresh-token' })
  })

  it('validates and maps credential authentication', async () => {
    await expect(authService.login('', '')).rejects.toBeInstanceOf(AuthValidationError)
    await expect(authService.register('', '', '')).rejects.toBeInstanceOf(AuthValidationError)
    const response = {
      accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600,
      user: { id: 'user-1', username: 'ana', email: 'ana@vinnot.com', name: 'Ana', roles: ['ROLE_USER'], emailVerified: true },
    } as never
    vi.mocked(authClient.login).mockResolvedValue(response)
    vi.mocked(authClient.register).mockResolvedValue({
      userId: 'user-1', email: 'ana@vinnot.com', emailVerificationRequired: true, message: 'ok',
    })

    await expect(authService.login('ana', 'Password1!')).resolves.toMatchObject({
      user: { id: 'user-1' }, tokens: { accessToken: 'access' },
    })
    expect(authClient.login).toHaveBeenLastCalledWith({ usernameOrEmail: 'ana', password: 'Password1!' })
    await authService.login('ana', 'Password1!', true)
    expect(authClient.login).toHaveBeenLastCalledWith({ usernameOrEmail: 'ana', password: 'Password1!', reactivate: true })
    await expect(authService.register('ana', 'ana@vinnot.com', 'Password1!', 'Ana', 'Pérez'))
      .resolves.toMatchObject({ userId: 'user-1' })
  })

  it('maps credential validation, verification and network failures', async () => {
    vi.mocked(authClient.login).mockRejectedValueOnce(new HttpError(401, 'INVALID', 'bad'))
    await expect(authService.login('ana', 'bad')).rejects.toMatchObject({ statusCode: 401, code: 'INVALID' })
    vi.mocked(authClient.login).mockRejectedValueOnce(
      new HttpError(422, 'VALIDATION', 'invalid', [{ field: 'password', message: 'weak' }]),
    )
    await expect(authService.login('ana', 'bad')).rejects.toMatchObject({
      fieldErrors: { password: ['weak'] },
    })
    vi.mocked(authClient.login).mockRejectedValueOnce(new Error('offline'))
    await expect(authService.login('ana', 'bad')).rejects.toMatchObject({ statusCode: 0 })

    vi.mocked(authClient.login).mockRejectedValueOnce(
      new HttpError(403, 'EMAIL_NOT_VERIFIED', 'not verified'),
    )
    await expect(authService.login('ana', 'bad')).rejects.toMatchObject({
      message: 'Verificá tu correo antes de iniciar sesión.', statusCode: 403,
    })

    vi.mocked(authClient.login).mockRejectedValueOnce(
      new HttpError(422, 'VALIDATION', 'invalid', 'bad details'),
    )
    await expect(authService.login('ana', 'bad')).rejects.toMatchObject({
      fieldErrors: { general: ['bad details'] },
    })

    vi.mocked(authClient.register).mockRejectedValueOnce(
      new HttpError(422, 'VALIDATION', 'invalid', { email: ['ocupado'] }),
    )
    await expect(authService.register('ana', 'used@vinnot.com', 'Password1!'))
      .rejects.toMatchObject({ fieldErrors: { email: ['ocupado'] } })
    vi.mocked(authClient.register).mockRejectedValueOnce(new HttpError(409, 'CONFLICT', 'used'))
    await expect(authService.register('ana', 'used@vinnot.com', 'Password1!'))
      .rejects.toBeInstanceOf(AuthApiError)

    vi.mocked(authClient.register).mockRejectedValueOnce(
      new HttpError(422, 'VALIDATION', 'invalid', { email: 'ocupado' }),
    )
    await expect(authService.register('ana', 'used@vinnot.com', 'Password1!'))
      .rejects.toMatchObject({ fieldErrors: { email: ['ocupado'] } })
    vi.mocked(authClient.register).mockRejectedValueOnce(new Error('offline'))
    await expect(authService.register('ana', 'mail@vinnot.com', 'Password1!'))
      .rejects.toMatchObject({ statusCode: 0 })
  })

  it('orchestrates social and account-action endpoints', async () => {
    vi.mocked(authClient.socialLogin).mockResolvedValue({
      accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600,
      user: { id: 'user-1', email: 'ana@vinnot.com', name: 'Ana' },
    } as never)
    vi.mocked(authClient.forgotPassword).mockResolvedValue({ message: 'forgot' })
    vi.mocked(authClient.resetPassword).mockResolvedValue({ message: 'reset' })
    vi.mocked(authClient.validatePasswordResetToken).mockResolvedValue({ status: 'VALID' } as never)
    vi.mocked(authClient.verifyEmail).mockResolvedValue({ message: 'verified' })
    vi.mocked(authClient.confirmEmailChange).mockResolvedValue({ message: 'changed' })
    vi.mocked(authClient.resendVerificationEmail).mockResolvedValue({ message: 'resent' })

    await expect(authService.socialLogin({ provider: 'GOOGLE', token: 'token' })).resolves.toMatchObject({
      user: { hasSocialIdentity: false, hasPassword: true },
    })
    vi.mocked(authClient.socialLogin).mockResolvedValueOnce({
      accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600,
      user: { id: 'user-1', email: 'ana@vinnot.com', name: 'Ana', hasSocialIdentity: true, hasPassword: false },
    } as never)
    await expect(authService.socialLogin({ provider: 'GOOGLE', token: 'token', reactivate: true })).resolves.toMatchObject({
      user: { hasSocialIdentity: true, hasPassword: false },
    })
    expect(authClient.socialLogin).toHaveBeenLastCalledWith({ provider: 'GOOGLE', token: 'token', reactivate: true })
    await expect(authService.forgotPassword('ana@vinnot.com')).resolves.toBe('forgot')
    await expect(authService.resetPassword('token', 'Password2!')).resolves.toBe('reset')
    await expect(authService.validatePasswordResetToken('token')).resolves.toEqual({ status: 'VALID' })
    await expect(authService.verifyEmail('token')).resolves.toBe('verified')
    await expect(authService.confirmEmailChange('token')).resolves.toBe('changed')
    await expect(authService.resendVerification('ana@vinnot.com')).resolves.toBe('resent')
  })

  it('maps account-action API and network errors', async () => {
    vi.mocked(authClient.socialLogin).mockRejectedValueOnce(new HttpError(403, 'DENIED', 'denied'))
    await expect(authService.socialLogin({ provider: 'FACEBOOK', token: 'bad' }))
      .rejects.toMatchObject({ statusCode: 403, code: 'DENIED' })
    vi.mocked(authClient.forgotPassword).mockRejectedValueOnce(new Error('offline'))
    await expect(authService.forgotPassword('ana@vinnot.com')).rejects.toMatchObject({ statusCode: 0 })

    vi.mocked(authClient.resetPassword).mockRejectedValueOnce(new HttpError(400, 'EXPIRED', 'expired'))
    await expect(authService.resetPassword('token', 'Password2!'))
      .rejects.toMatchObject({ statusCode: 400, code: 'EXPIRED' })
    vi.mocked(authClient.validatePasswordResetToken).mockRejectedValueOnce(new Error('offline'))
    await expect(authService.validatePasswordResetToken('token'))
      .rejects.toMatchObject({ statusCode: 0 })
    vi.mocked(authClient.verifyEmail).mockRejectedValueOnce(new Error('offline'))
    await expect(authService.verifyEmail('token')).rejects.toMatchObject({ statusCode: 0 })
    vi.mocked(authClient.confirmEmailChange).mockRejectedValueOnce(new Error('offline'))
    await expect(authService.confirmEmailChange('token')).rejects.toMatchObject({ statusCode: 0 })
    vi.mocked(authClient.resendVerificationEmail).mockRejectedValueOnce(new Error('offline'))
    await expect(authService.resendVerification('ana@vinnot.com'))
      .rejects.toMatchObject({ statusCode: 0 })
  })

  it('maps current user and distinguishes terminal from transient session failures', async () => {
    vi.mocked(authClient.getCurrentUser).mockResolvedValue({
      id: 'user-1', username: 'ana', email: 'ana@vinnot.com', name: 'Ana',
      roles: ['ROLE_USER'], emailVerified: true, hasSocialIdentity: true, hasPassword: true, socialProviders: ['GOOGLE'],
    } as never)
    await expect(authService.getCurrentUser()).resolves.toMatchObject({
      id: 'user-1', socialProviders: ['GOOGLE'], hasSocialIdentity: true, hasPassword: true,
      bio: null, cellarVisibility: 'PUBLIC',
    })
    vi.mocked(authClient.getCurrentUser).mockResolvedValueOnce({
      id: 'user-1', username: 'ana', email: 'ana@vinnot.com', name: 'Ana', roles: ['ROLE_USER'], emailVerified: true,
      bio: 'Malbec lover', cellarVisibility: 'FOLLOWERS',
    } as never)
    await expect(authService.getCurrentUser()).resolves.toMatchObject({ bio: 'Malbec lover', cellarVisibility: 'FOLLOWERS' })

    vi.mocked(authClient.getCurrentUser).mockRejectedValueOnce(
      new HttpError(400, 'ACCOUNT_DISABLED', 'disabled'),
    )
    await expect(authService.getCurrentUser()).rejects.toMatchObject({ isSessionExpired: true })
    vi.mocked(authClient.getCurrentUser).mockRejectedValueOnce(new HttpError(500, 'FAILED', 'failed'))
    await expect(authService.getCurrentUser()).rejects.toMatchObject({ isSessionExpired: false })
    vi.mocked(authClient.getCurrentUser).mockRejectedValueOnce(new Error('offline'))
    await expect(authService.getCurrentUser()).rejects.toMatchObject({ statusCode: 0 })
  })

  it('reports a server logout failure so cookie revocation can be retried', async () => {
    vi.mocked(authClient.logout).mockRejectedValueOnce(new NetworkError())
    await expect(authService.logout()).rejects.toBeInstanceOf(AuthApiError)
  })
})
